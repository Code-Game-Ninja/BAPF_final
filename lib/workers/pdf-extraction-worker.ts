/**
 * PDF Extraction Background Worker
 * Handles PDF extraction in a background process to avoid blocking the main thread
 * 
 * Usage:
 * 1. Client uploads PDF
 * 2. Server creates extraction job
 * 3. Worker processes extraction asynchronously
 * 4. Client polls for results or receives webhook notification
 */

import { extractPolicyDataFromFile } from '@/lib/helpers/pdf-extractor';

export interface ExtractionJob {
  id: string;
  fileUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

// In-memory job queue (replace with Redis/BullMQ in production)
const jobQueue: Map<string, ExtractionJob> = new Map();

/**
 * Create a new extraction job
 */
export async function createExtractionJob(fileUrl: string): Promise<string> {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const job: ExtractionJob = {
    id: jobId,
    fileUrl,
    status: 'pending',
    createdAt: new Date(),
  };
  
  jobQueue.set(jobId, job);
  
  // Process job asynchronously
  processJob(jobId).catch((error) => {
    console.error(`[Worker] Job ${jobId} failed:`, error);
    const job = jobQueue.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = error.message;
      job.completedAt = new Date();
    }
  });
  
  return jobId;
}

/**
 * Get job status
 */
export function getJobStatus(jobId: string): ExtractionJob | null {
  return jobQueue.get(jobId) || null;
}

/**
 * Process extraction job
 */
async function processJob(jobId: string): Promise<void> {
  const job = jobQueue.get(jobId);
  if (!job) throw new Error('Job not found');
  
  job.status = 'processing';
  
  try {
    // Fetch file from URL
    const response = await fetch(job.fileUrl);
    if (!response.ok) throw new Error('Failed to fetch file');
    
    const blob = await response.blob();
    const file = new File([blob], 'document.pdf', { type: blob.type });
    
    // Extract data
    const result = await extractPolicyDataFromFile(file);
    
    // Update job
    job.status = 'completed';
    job.result = result;
    job.completedAt = new Date();
    
    console.log(`[Worker] Job ${jobId} completed successfully`);
  } catch (error: any) {
    job.status = 'failed';
    job.error = error.message;
    job.completedAt = new Date();
    throw error;
  }
}

/**
 * Clean up old jobs (run periodically)
 */
export function cleanupOldJobs(maxAgeMs: number = 24 * 60 * 60 * 1000): void {
  const now = Date.now();
  
  for (const [jobId, job] of jobQueue.entries()) {
    const age = now - job.createdAt.getTime();
    if (age > maxAgeMs) {
      jobQueue.delete(jobId);
      console.log(`[Worker] Cleaned up old job ${jobId}`);
    }
  }
}

// Clean up old jobs every hour
if (typeof window === 'undefined') {
  setInterval(() => cleanupOldJobs(), 60 * 60 * 1000);
}
