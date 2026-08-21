import React from "react"

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-screen-xl flex-col items-center gap-1 px-4 sm:flex-row sm:justify-between md:px-6">
        <p>&copy; {new Date().getFullYear()} Seraphim</p>
        <p>
          Data by{" "}
          <a
            href="https://github.com/KHwang9883/MobileModels/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            KHwang9883/MobileModels
          </a>
          <span className="mx-1">·</span>
          <a
            href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
            target="_blank"
            rel="license noopener noreferrer"
            className="text-foreground underline underline-offset-4 hover:text-muted-foreground"
          >
            CC BY-NC-SA 4.0
          </a>
        </p>
      </div>
    </footer>
  )
}

export default Footer
