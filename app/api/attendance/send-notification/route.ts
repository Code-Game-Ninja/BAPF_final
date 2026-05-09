/**
 * POST /api/attendance/send-notification
 * ─────────────────────────────────────────────────────────────────────────────
 * Send attendance-related email notifications.
 *
 * Allowed roles: admin, manager
 *
 * Body:
 * {
 *   type:      "late_checkin" | "absent_reminder" | "early_checkout";
 *   user_id:   string;              // Target employee UID
 *   message?:  string;              // Optional custom message (for absent_reminder)
 *   // For late_checkin — extra data auto-fetched from attendance record
 *   attendance_id?: string;
 *   // For early_checkout
 *   checkout_time?: string;
 *   reason?:       string;
 * }
 */

import { errorResponse } from "@/lib/api/error";
import { NextRequest, NextResponse } from "next/server";
import { requireAuth, isAuthError, authError } from "@/lib/api/auth-middleware";
import { supabaseAdmin } from "@/lib/supabase/server";
import { emailService, setEmailCompanyName, setEmailCompanyEmail, setEmailCompanyPhone } from "@/lib/services/email.service";
import { protect } from "@/lib/api/protect";

import { attendanceNotificationSchema } from "@/lib/validations/attendance";

export async function POST(req: NextRequest) {
  const blocked = protect(req, { maxRequests: 20, windowMs: 60_000 });
  if (blocked) return blocked;

  // ── Auth: admin, manager, or employee (employee can only self-notify for late_checkin) ──
  const caller = await requireAuth(req, ["admin", "manager", "employee"]);
  if (isAuthError(caller)) return authError(caller);

  // ── Parse body ──
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = attendanceNotificationSchema.safeParse(body);
  if (!result.success) {
    return NextResponse.json(
      { error: "Validation failed", details: result.error.flatten().fieldErrors },
      { status: 422 }
    );
  }

  const data = result.data;

  // Employees can ONLY trigger late_checkin notifications for themselves
  if (caller.role === "employee") {
    if (data.type !== "late_checkin" || data.user_id !== caller.uid) {
      return NextResponse.json(
        { error: "Employees can only trigger late check-in notices for themselves" },
        { status: 403 },
      );
    }
  }

  try {
    // ── Fetch target employee ──
    const { data: targetUser, error: userError } = await supabaseAdmin
      .from("users")
      .select("*")
      .eq("id", data.user_id)
      .single();

    if (userError || !targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!targetUser.email) {
      return NextResponse.json({ error: "User has no email address" }, { status: 422 });
    }

    const employeeName = targetUser.name || targetUser.email;

    // ── Fetch office settings ──
    const { data: configs } = await supabaseAdmin
      .from("system_config")
      .select("key, value")
      .in("key", [
        "office_start_time",
        "late_threshold_minutes", 
        "company_name",
        "email_notifications_enabled",
        "company_email",
        "company_phone",
      ]);

    const configMap = Object.fromEntries((configs || []).map((c) => [c.key, c.value]));
    let officeStartTime = "09:00";
    const rawStartTime = String(configMap.office_start_time || "09:00");
    if (/^\d{2}:\d{2}$/.test(rawStartTime)) {
      const [h, m] = rawStartTime.split(":").map(Number);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        officeStartTime = rawStartTime;
      }
    }
    const lateThreshold = parseInt(String(configMap.late_threshold_minutes || 15), 10);
    if (configMap.company_name) setEmailCompanyName(String(configMap.company_name));
    if (configMap.company_email) setEmailCompanyEmail(String(configMap.company_email));
    if (configMap.company_phone) setEmailCompanyPhone(String(configMap.company_phone));
    const emailEnabled = configMap.email_notifications_enabled !== "false";
    if (!emailEnabled) {
      return NextResponse.json({ error: "Email notifications are disabled in settings" }, { status: 403 });
    }

    // ── Fetch sender name ──
    const { data: callerUser } = await supabaseAdmin
      .from("users")
      .select("name, email")
      .eq("id", caller.uid)
      .single();
    const senderName = callerUser?.name || caller.email;

    const today = new Date();
    const todayStr = today.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

    let emailResult: { messageId?: string } | undefined;

    // ── Route by notification type ──
    switch (data.type) {
      case "late_checkin": {
        // Fetch the attendance record to get check-in time
        let checkInTimeStr = "N/A";
        let lateByMinutes = 0;

        if (data.attendance_id) {
          const { data: att } = await supabaseAdmin
            .from("attendance")
            .select("*")
            .eq("id", data.attendance_id)
            .single();

          if (att?.check_in) {
            const checkInDate = new Date(att.check_in);
            checkInTimeStr = checkInDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            // Calculate late-by
            const [startH, startM] = officeStartTime.split(":").map(Number);
            const cutoff = new Date(
              checkInDate.getFullYear(),
              checkInDate.getMonth(),
              checkInDate.getDate(),
              startH,
              startM + lateThreshold,
            );
            lateByMinutes = Math.max(
              0,
              Math.round((checkInDate.getTime() - cutoff.getTime()) / 60000),
            );
          }
        }

        emailResult = await emailService.sendLateCheckIn(targetUser.email, {
          employeeName,
          date: todayStr,
          checkInTime: checkInTimeStr,
          officeStartTime,
          lateByMinutes,
        });
        break;
      }

      case "absent_reminder": {
        emailResult = await emailService.sendAbsentReminder(targetUser.email, {
          employeeName,
          date: todayStr,
          senderName,
          message: data.message,
        });
        break;
      }

      case "early_checkout": {
        emailResult = await emailService.sendEarlyCheckoutNotice(targetUser.email, {
          employeeName,
          date: todayStr,
          checkOutTime: data.checkout_time || "N/A",
          approvedBy: senderName,
          reason: data.reason || "No reason provided",
        });
        break;
      }
    }

    // ── Also create in-app notification ──
    await supabaseAdmin.from("notifications").insert({
      user_id: data.user_id,
      title:
        data.type === "late_checkin"
          ? "Late Check-In Notice"
          : data.type === "absent_reminder"
            ? "Attendance Reminder"
            : "Early Checkout Approved",
      message:
        data.type === "late_checkin"
          ? `You were marked late today (${todayStr}).`
          : data.type === "absent_reminder"
            ? `You haven't checked in today. Please check in or inform your manager.`
            : `Your early checkout has been approved.`,
      type: "attendance",
      read: false,
      link: "/dashboard/attendance",
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      messageId: emailResult?.messageId,
      sentTo: targetUser.email,
      notificationType: data.type,
    });
  } catch (err: unknown) {
    console.error("[attendance/send-notification] Error:", err);
    return NextResponse.json(
      { error: "Failed to send attendance notification" },
      { status: 500 },
    );
  }
}
