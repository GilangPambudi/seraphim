import React from "react"

const Footer: React.FC = () => {
  return (
    <footer className="bg-[#292b2d] text-[#e8e7df]">
      <div className="editorial-shell grid gap-10 border-t border-white/10 py-12 md:grid-cols-[1fr_auto] md:items-end md:py-16">
        <div>
          <p className="editorial-kicker text-[#ff8147]">Seraphim / Phone model index</p>
          <p className="mt-4 max-w-xl text-sm leading-6 text-white/45">
            A focused technical directory for browsing brands, model families, codenames and model numbers.
          </p>
        </div>

        <div className="text-left text-xs uppercase tracking-[0.1em] text-white/45 md:text-right">
          <p>&copy; {new Date().getFullYear()} Seraphim</p>
          <p className="mt-2 normal-case tracking-normal">
            Data by{" "}
            <a
              href="https://github.com/KHwang9883/MobileModels/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#e8e7df] underline underline-offset-4 hover:text-[#ff8147]"
            >
              KHwang9883/MobileModels
            </a>
            <span className="mx-1.5">·</span>
            <a
              href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
              target="_blank"
              rel="license noopener noreferrer"
              className="text-[#e8e7df] underline underline-offset-4 hover:text-[#ff8147]"
            >
              CC BY-NC-SA 4.0
            </a>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
