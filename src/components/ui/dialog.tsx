"use client";

import { X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useRef, type ReactNode } from "react";
import { Button } from "./button";

export function Modal({ title, description, onClose, children }: {
  title: string;
  description: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const trigger = useRef<HTMLElement | null>(null);
  return <Dialog.Root open onOpenChange={(open) => { if (!open) onClose(); }}>
    <Dialog.Portal>
      <Dialog.Overlay className="modal-overlay" />
      <Dialog.Content className="modal" onOpenAutoFocus={() => {
        trigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      }} onCloseAutoFocus={(event) => {
        event.preventDefault();
        trigger.current?.focus();
      }}>
        <div className="modal-heading">
          <Dialog.Title>{title}</Dialog.Title>
          <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close"><X size={19} /></Button></Dialog.Close>
        </div>
        <Dialog.Description className="muted modal-description">{description}</Dialog.Description>
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
