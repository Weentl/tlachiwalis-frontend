"use client";
import { useState } from "react";
import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

export function ImageUpload({
  name,
  label,
  initial,
  hint,
  rounded = "rounded-ob-sm",
}: {
  name: string;
  label: string;
  initial?: string | null;
  hint?: string;
  rounded?: string;
}) {
  const [preview, setPreview] = useState<string | null>(initial ?? null);
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <div className="mt-1.5 flex items-center gap-4">
        <div
          className={`relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden border border-tinto/20 bg-background ${rounded}`}
        >
          {preview ? (
            <Image src={preview} alt="" fill sizes="80px" className="object-cover" unoptimized />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>
        <input
          id={name}
          name={name}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const fl = e.target.files?.[0];
            setPreview(fl ? URL.createObjectURL(fl) : (initial ?? null));
          }}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-ob-sm file:border file:border-tinto/30 file:bg-tinto/5 file:px-4 file:py-2 file:text-xs file:font-medium file:uppercase file:tracking-[0.06em] file:text-tinto hover:file:bg-tinto/10"
        />
      </div>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
