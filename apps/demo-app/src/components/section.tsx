import React, { PropsWithChildren, ReactNode } from "react";

export const Section: React.FC<PropsWithChildren<{ title: string; footer?: ReactNode }>> = ({ title, children, footer }) => {
  return (
    <div>
      <section className={`rounded-t-lg ${!footer ? "rounded-b-lg" : ""} border border-zinc-200 px-4 py-6 bg-white`}>
        <h3 className="text-zinc-900 font-semibold text-lg">{title}</h3>
        <div className="mt-6 leading-6">{children}</div>
      </section>
      {footer && <div className="bg-zinc-50 border-b border-l bor;der-r rounded-b-lg px-4 py-4">{footer}</div>}
    </div>
  )
}
