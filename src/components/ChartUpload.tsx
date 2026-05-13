import { useState, useRef, type ChangeEvent } from "react";
import { Upload, X, Camera } from "lucide-react";

interface ChartUploadProps {
  onImageUpload: (src: string) => void;
  uploadedImage: string | null;
  onClear: () => void;
}

export default function ChartUpload({ onImageUpload, uploadedImage, onClear }: ChartUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) loadFile(e.dataTransfer.files[0]);
  };
  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) loadFile(e.target.files[0]);
  };
  const loadFile = (file: File) => {
    if (!file.type.startsWith("image/")) { alert("Please upload an image file (PNG, JPG, WEBP)"); return; }
    const reader = new FileReader();
    reader.onload = (e) => onImageUpload(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  if (uploadedImage) {
    return (
      <div className="relative w-full" style={{ minHeight: 480 }}>
        <img src={uploadedImage} alt="Chart for analysis" className="w-full h-full object-contain" style={{ minHeight: 480 }} />
        <button onClick={(e) => { e.stopPropagation(); onClear(); }} className="absolute top-3 right-3 z-20 bg-[#0d0d0d]/90 backdrop-blur-sm border border-[#1f1f1f] text-white rounded-full p-2.5 hover:bg-[#e11d48] hover:border-[#e11d48] transition-all shadow-lg"><X size={16} /></button>
        <div className="absolute bottom-3 left-3 z-20 bg-[#0d0d0d]/90 backdrop-blur-sm border border-[#1f1f1f] rounded-lg px-3 py-1.5"><span className="text-[#a0a0a0] text-[10px]">Chart uploaded • Enter price levels below</span></div>
      </div>
    );
  }

  return (
    <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => inputRef.current?.click()} className={`w-full flex flex-col items-center justify-center cursor-pointer transition-all duration-300 ${dragActive ? "bg-[#d4a843]/8 border-2 border-dashed border-[#d4a843]" : "bg-[#0a0a0a] border-2 border-dashed border-[#1f1f1f] hover:border-[#d4a843]/40"}`} style={{ minHeight: 480 }}>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 transition-all ${dragActive ? "bg-[#d4a843]/20 scale-110" : "bg-[#141414]"}`}>
        {dragActive ? <Upload size={32} className="text-[#d4a843]" /> : <Camera size={32} className="text-[#666666]" />}
      </div>
      <p className="text-white font-semibold text-base mb-2">{dragActive ? "Drop chart image here" : "Upload your chart screenshot"}</p>
      <p className="text-[#666666] text-sm mb-1">Drag & drop or click to upload</p>
      <p className="text-[#666666] text-xs mb-4">PNG, JPG, WEBP • Max 10MB</p>
      <div className="flex flex-wrap gap-2 justify-center">
        {["TradingView", "MT4", "MT5", "Any platform"].map((p) => (
          <span key={p} className="text-[#666666] text-[10px] bg-[#141414] border border-[#1f1f1f] rounded-full px-2.5 py-1">{p}</span>
        ))}
      </div>
    </div>
  );
}
