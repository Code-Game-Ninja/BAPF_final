"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Plus, Pencil, Trash2, Loader2, Lock, Globe } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/lib/context/auth-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Note {
  id: string;
  content: string;
  visibility: "internal" | "customer";
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

interface NotesSectionProps {
  ticketId: string;
  notes: Note[];
  onNotesChange: () => void;
}

export function NotesSection({ ticketId, notes, onNotesChange }: NotesSectionProps) {
  const { session, user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"internal" | "customer">("internal");
  const [newNote, setNewNote] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [editContent, setEditContent] = useState("");
  const [deletingNote, setDeletingNote] = useState<Note | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const internalNotes = notes.filter(n => n.visibility === "internal");
  const customerNotes = notes.filter(n => n.visibility === "customer");

  const handleAddNote = async () => {
    if (!newNote.trim() || !session?.access_token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: newNote, visibility: activeTab }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setNewNote("");
      setIsAdding(false);
      onNotesChange();
      toast.success("Note added");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditNote = async () => {
    if (!editingNote || !editContent.trim() || !session?.access_token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/notes/${editingNote.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ content: editContent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingNote(null);
      onNotesChange();
      toast.success("Note updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async () => {
    if (!deletingNote || !session?.access_token) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/service-desk/tickets/${ticketId}/notes/${deletingNote.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setDeletingNote(null);
      onNotesChange();
      toast.success("Note deleted");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const canEditNote = (note: Note) =>
    note.author_id === user?.id || role === "admin";

  const NoteList = ({ noteList }: { noteList: Note[] }) => (
    <div className="space-y-3">
      {noteList.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No notes yet.</p>
      ) : (
        noteList.map(note => (
          <div key={note.id} className="bg-muted/20 rounded-xl p-3 space-y-2">
            {editingNote?.id === note.id ? (
              <div className="space-y-2">
                <Textarea
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  rows={3}
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleEditNote} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingNote(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium">{note.author_name}</span>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(note.created_at), "dd MMM yyyy, HH:mm")}
                    </span>
                    {note.updated_at !== note.created_at && (
                      <span className="text-xs text-muted-foreground">(edited)</span>
                    )}
                  </div>
                  {canEditNote(note) && (
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => { setEditingNote(note); setEditContent(note.content); }}
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 text-red-400 hover:text-red-400"
                        onClick={() => setDeletingNote(note)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ))
      )}

      {/* Add note form */}
      {isAdding ? (
        <div className="space-y-2">
          <Textarea
            placeholder={`Add ${activeTab === "internal" ? "internal" : "customer-visible"} note...`}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            rows={3}
            autoFocus
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddNote} disabled={isSubmitting || !newNote.trim()}>
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Add Note
            </Button>
            <Button size="sm" variant="outline" onClick={() => { setIsAdding(false); setNewNote(""); }}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsAdding(true)}
          className="w-full gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Note
        </Button>
      )}
    </div>
  );

  return (
    <>
      <Tabs value={activeTab} onValueChange={v => { setActiveTab(v as "internal" | "customer"); setIsAdding(false); setNewNote(""); }}>
        <TabsList className="w-full">
          <TabsTrigger value="internal" className="flex-1 gap-2">
            <Lock className="w-3.5 h-3.5" />
            Internal
            {internalNotes.length > 0 && (
              <Badge variant="secondary" className="text-xs">{internalNotes.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="customer" className="flex-1 gap-2">
            <Globe className="w-3.5 h-3.5" />
            Customer
            {customerNotes.length > 0 && (
              <Badge variant="secondary" className="text-xs">{customerNotes.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>
        <TabsContent value="internal" className="mt-3">
          <NoteList noteList={internalNotes} />
        </TabsContent>
        <TabsContent value="customer" className="mt-3">
          <NoteList noteList={customerNotes} />
        </TabsContent>
      </Tabs>

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingNote} onOpenChange={open => !open && setDeletingNote(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting && <Loader2 className="w-3 h-3 animate-spin mr-1" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
