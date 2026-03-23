import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UploadCloudIcon, FileTextIcon, CheckCircle2Icon, XCircleIcon, UsersIcon } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

export function LeadGenUploadView() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus('idle');
      setUploadProgress(0);
      setErrorMessage('');
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setErrorMessage('Please select a file to upload.');
      return;
    }

    setUploadStatus('uploading');
    setUploadProgress(0);
    setErrorMessage('');

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        // Simulate success or error
        if (Math.random() > 0.2) { // 80% chance of success
          setUploadStatus('success');
        } else {
          setUploadStatus('error');
          setErrorMessage('Failed to process Lead Gen file. Please try again.');
        }
      }
    }, 200);
  };

  return (
    <div className="space-y-6 relative z-10">
      <Card className="bg-card text-card-foreground max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle className="text-foreground text-2xl flex items-center gap-3">
            <UsersIcon className="h-6 w-6 text-pink-600" strokeWidth={1.5} />
            Upload Lead Gen Data
          </CardTitle>
          <p className="text-muted-foreground">
            Upload your Lead Generation data via an Excel file (.xlsx, .csv) to update prospecting.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-border rounded-lg bg-muted/20">
            <input
              id="lead-gen-file-upload"
              type="file"
              accept=".xlsx,.csv"
              className="hidden"
              onChange={handleFileChange}
            />
            <Label htmlFor="lead-gen-file-upload" className="cursor-pointer flex flex-col items-center gap-3">
              <UploadCloudIcon className="h-12 w-12 text-muted-foreground" strokeWidth={1.5} />
              <p className="text-foreground font-medium">Drag & drop or <span className="text-primary">browse</span> to upload</p>
              <p className="text-muted-foreground text-sm">Supports .xlsx, .csv files (max 10MB)</p>
            </Label>
            {selectedFile && (
              <div className="mt-4 flex items-center gap-2 text-sm text-foreground">
                <FileTextIcon className="h-4 w-4 text-muted-foreground" />
                <span>{selectedFile.name}</span>
              </div>
            )}
          </div>

          {uploadStatus === 'uploading' && (
            <div className="space-y-2">
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-sm text-muted-foreground text-center">Uploading... {uploadProgress}%</p>
            </div>
          )}

          {uploadStatus === 'success' && (
            <div className="flex items-center justify-center gap-2 text-success font-medium">
              <CheckCircle2Icon className="h-5 w-5" />
              Upload successful! Lead Gen data is being processed.
            </div>
          )}

          {uploadStatus === 'error' && (
            <div className="flex items-center justify-center gap-2 text-destructive font-medium">
              <XCircleIcon className="h-5 w-5" />
              {errorMessage || 'Upload failed. Please try again.'}
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploadStatus === 'uploading'}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {uploadStatus === 'uploading' ? 'Uploading...' : 'Upload Data'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
