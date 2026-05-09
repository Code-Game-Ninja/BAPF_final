/**
 * Background PDF Extraction API
 * Creates extraction jobs that run asynchronously
 */

import { NextRequest, NextResponse } from 'next/server';
import { createExtractionJob, getJobStatus } from '@/lib/workers/pdf-extraction-worker';
import { supabase } from '@/lib/supabase/client';
import { errorResponse } from '@/lib/api/error';

export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * POST /api/extract-pdf/background
 * Create a background extraction job
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Upload file to temporary storage
    const timestamp = Date.now();
    const fileName = `temp/${timestamp}_${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('policy-documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false,
      });
    
    if (uploadError) {
      console.error('[Background Extract] Upload failed:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('policy-documents')
      .getPublicUrl(fileName);
    
    // Create extraction job
    const jobId = await createExtractionJob(publicUrl);
    
    return NextResponse.json({
      jobId,
      status: 'pending',
      message: 'Extraction job created. Poll /api/extract-pdf/background/status?jobId=<jobId> for results.',
    });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}

/**
 * GET /api/extract-pdf/background/status?jobId=<jobId>
 * Get extraction job status
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const jobId = searchParams.get('jobId');
    
    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID required' },
        { status: 400 }
      );
    }
    
    const job = getJobStatus(jobId);
    
    if (!job) {
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      completedAt: job.completedAt,
    });
  } catch (err: unknown) {
    return errorResponse(err);
  }
}
