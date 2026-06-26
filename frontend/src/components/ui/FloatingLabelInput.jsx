import * as React from "react"

import { cn } from "@/lib/utils"

const FloatingLabelInput = React.forwardRef(({ className, label, id, ...props }, ref) => {
  const generatedId = React.useId()
  const inputId = id || generatedId

  return (
    <div className="floating-label-input-container mt-3">
      <input
        ref={ref}
        id={inputId}
        className={cn("floating-label-input", className)}
        placeholder=" "
        {...props}
      />
      <label htmlFor={inputId} className="floating-label">
        {label}
      </label>
    </div>
  )
})
FloatingLabelInput.displayName = "FloatingLabelInput"

export { FloatingLabelInput }
