import React, { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, FileText } from 'lucide-react';
import { parseCSV } from '../../services/parsing/csvParser';
import { parseExcel } from '../../services/parsing/excelParser';
import { parsePatientRows } from '../../services/patients/PatientParser';
import { PatientParseResult } from '../../services/patients/PatientTypes';

interface PatientUploadZoneProps {
  onParsed: (result: PatientParseResult, fileName: string) => void;
  onError: (errorMessage: string) => void;
}

export default function PatientUploadZone({ onParsed, onError }: PatientUploadZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension !== 'csv' && extension !== 'xlsx') {
      onError('Unsupported file format. Please upload a CSV (.csv) or Excel (.xlsx) file.');
      return;
    }

    setFileName(file.name);
    setLoading(true);
    setProgress(0);

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 15;
      });
    }, 80);

    try {
      let rawGrid: string[][] = [];

      if (extension === 'csv') {
        const text = await file.text();
        rawGrid = parseCSV(text);
      } else {
        rawGrid = await parseExcel(file);
      }

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        const parseResult = parsePatientRows(rawGrid);
        onParsed(parseResult, file.name);
        setLoading(false);
        setProgress(0);
      }, 300);
    } catch (err: any) {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
      setFileName(null);
      onError(err?.message || 'An error occurred while reading the file.');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-emerald-500 bg-emerald-500/5'
            : 'border-white/10 hover:border-emerald-500/50 bg-[#121212] hover:bg-white/[0.01]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv, .xlsx"
          onChange={handleChange}
          className="hidden"
          disabled={loading}
        />

        {loading ? (
          <div className="w-full max-w-xs space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400">
              <span className="truncate max-w-[200px]">{fileName}</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 animate-pulse">Reading & validating patient data...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-white/[0.02] flex items-center justify-center border border-white/5 text-gray-400">
              <Upload className="w-6 h-6 text-emerald-400" />
            </div>

            <div className="space-y-1">
              <p className="text-white font-medium text-base">
                Drag and drop your patient list here, or <span className="text-emerald-400 underline">browse</span>
              </p>
              <p className="text-xs text-gray-500">
                Columns expected: Name, Phone, Last Visit Date (optional), Clinic (optional)
              </p>
            </div>

            <div className="flex items-center justify-center gap-4 pt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
                <FileText className="w-3.5 h-3.5 text-gray-500" /> CSV
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-400 bg-white/[0.02] border border-white/5 px-2.5 py-1 rounded-lg">
                <FileSpreadsheet className="w-3.5 h-3.5 text-gray-500" /> Excel (.xlsx)
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
