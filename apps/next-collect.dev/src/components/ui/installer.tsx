"use client"

import React, { ReactNode, useState } from "react"
import { cn } from "@/lib/utils"
import { Check, Copy } from "lucide-react"

type TabItem = {
  id: string
  label?: ReactNode
}
type TabsProps = {
  tabs: (TabItem | string)[]
  value: string
  onChange: (value: string) => void
}

const Tabs: React.FC<TabsProps> = ({ tabs, value, onChange }) => {
  const [currentVal, setCurrentVal] = useState(value)
  const _tab = tabs.map(t => (typeof t === "string" ? { id: t, label: t } : t))
  return (
    <div className="flex space-x-2 justify-between mb-4">
      {_tab.map(tab => (
        <button
          key={tab.id}
          className={cn(
            currentVal === tab.id ? "border-sky-600 text-sky-500 rounded-t" : "border-transparent rounded",
            "border-b-2 p-2 hover:bg-neutral-200"
          )}
          onClick={() => {
            setCurrentVal(tab.id)
            onChange(tab.id)
          }}
        >
          {tab.label || tab.id}
        </button>
      ))}
    </div>
  )
}


const CopyButton: React.FC<{ text: string }> = ({text}) => {
  const [copied, setCopied] = useState(false);
  return (
    <button className="h-5" onClick={() => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    }}>
      {!copied ? (
        <Copy className="w-full h-full text-neutral-400" />
      ) : (
        <Check className="w-full h-full text-emerald-500" />
      )}
    </button>
  )
}

const Command: React.FC<{ command: string; children: ReactNode }> = ({ command, children }) => {
  return (
    <div className="px-4 py-3 bg-neutral-200/50 rounded-lg font-mono text-left group relative">
      <span className="mr-2 select-none">$</span>
      {children}
      <div className="group-hover:visible invisible absolute right-0 top-0 translate-y-1/2 mr-2">
        <CopyButton text={command} />
      </div>
    </div>
  )
}

export const Installer: React.FC<{ className?: string }> = ({ className }) => {
  const [packageManager, setPackageManager] = useState("pnpm")
  return (
    <div className={className}>
      <Tabs
        tabs={["pnpm", "npm", "bun", "yarn"]}
        value={packageManager}
        onChange={val => {
          setPackageManager(val)
        }}
      />
      <Command command={`${packageManager} ${packageManager === "npm" ? "install" : "add"} next-collect`}>
        <span className="text-red-700">{packageManager}</span> {packageManager === "npm" ? "install" : "add"}{" "}
        next-collect
      </Command>
    </div>
  )
}
