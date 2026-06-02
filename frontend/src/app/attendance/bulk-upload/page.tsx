"use client";

import { useState } from "react";
import { Upload, FileUp, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function BulkUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errors, setErrors] = useState<{ row: number; error: string }[]>([]);
  const router = useRouter();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrors([]); // reset errors when new file is selected
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setErrors([]);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // The auth token lives in an httpOnly cookie (hrms_at) that JS can't
      // read, so send credentials and let the browser attach it automatically.
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

      const res = await fetch(`${apiUrl}/api/attendance/upload-bulk`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Successfully uploaded ${data.inserted} records!`);
        if (data.errors && data.errors.length > 0) {
          setErrors(data.errors);
          toast.warning(`Uploaded with some row errors.`);
        } else {
          router.push("/attendance");
        }
      } else {
        toast.error(data.error?.message || "Failed to upload attendance");
        if (data.error?.details) {
          setErrors(data.error.details);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred during upload.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bulk Attendance Upload</h1>
        <p className="text-muted-foreground">Upload an Excel sheet (.xlsx or .csv) to import attendance records.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>
            The Excel file must contain headers: Employee Code, Date, In Time, Out Time, Worked Hours, Location.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center w-full">
            <label
              htmlFor="dropzone-file"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-muted/30 hover:bg-muted/50 border-muted-foreground/25"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm text-muted-foreground">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-muted-foreground">.XLSX or .CSV (Max 5MB)</p>
              </div>
              <input
                id="dropzone-file"
                type="file"
                accept=".xlsx, .csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
          </div>

          {file && (
            <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg border">
              <FileUp className="h-6 w-6 text-primary" />
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(2)} KB</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFile(null)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                Remove
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="bg-muted/30 py-4 px-6 border-t flex justify-end">
          <Button
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload Attendance"}
          </Button>
        </CardFooter>
      </Card>

      {errors.length > 0 && (
        <Card className="border-destructive/50 border">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">Upload Errors</CardTitle>
            </div>
            <CardDescription>
              Some rows could not be processed. Please fix these in your sheet and re-upload.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <div className="max-h-[300px] overflow-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-medium">Row</th>
                      <th className="p-3 text-left font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.map((err, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 font-mono">{err.row}</td>
                        <td className="p-3 text-destructive">{err.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
