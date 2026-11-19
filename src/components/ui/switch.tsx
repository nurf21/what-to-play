"use client";

import { Switch as RadixSwitch } from "radix-ui";
import type { ComponentProps } from "react";

export function Switch(props: ComponentProps<typeof RadixSwitch.Root>) {
  return <RadixSwitch.Root className="switch" {...props}><RadixSwitch.Thumb className="switch-thumb" /></RadixSwitch.Root>;
}
