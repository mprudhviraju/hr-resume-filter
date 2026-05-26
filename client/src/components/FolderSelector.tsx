import { FolderOpen, FileUp } from 'lucide-react';
import { useRef, useState, useCallback } from 'react';

interface FolderSelectorProps {
  folderPath: string;
  onFolderChange: (path: string) => void;
  onFilesSelected?: (files: FileList | null) => void;
  showServerFolderPath?: boolean;
}

const FolderSelector: React.FC<FolderSelectorProps> = ({
  folderPath,
  onFolderChange,
  onFilesSelected,
  showServerFolderPath = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFolderSelect = () => {
    const path = prompt(
      'Please enter the full path to the folder containing resumes (server-side path):'
    );
    if (path) onFolderChange(path);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onFilesSelected?.(files);
      onFolderChange('');
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFilesSelected?.(files);
        onFolderChange('');
      }
    },
    [onFilesSelected, onFolderChange],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
          isDragging
            ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
            : 'border-gray-200 bg-gray-50/50 hover:border-indigo-300 hover:bg-indigo-50/30'
        }`}
      >
        <div className={`mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
          isDragging ? 'bg-indigo-100' : 'bg-gray-100'
        }`}>
          <FileUp size={22} className={isDragging ? 'text-indigo-500' : 'text-gray-400'} />
        </div>
        <p className="text-sm font-medium text-gray-700">
          {isDragging ? 'Drop files here' : 'Drag & drop resume files here'}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          or <span className="text-indigo-500 font-medium">click to browse</span> &middot; PDF, DOC, DOCX
        </p>
      </div>

      {showServerFolderPath && (
        <>
          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">or</span>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={folderPath}
              onChange={(e) => onFolderChange(e.target.value)}
              placeholder="Server-side folder path (local dev only)"
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50"
            />
            <button
              type="button"
              onClick={handleFolderSelect}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg flex items-center gap-1.5 text-sm transition-colors"
            >
              <FolderOpen size={16} />
              Browse
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default FolderSelector;
