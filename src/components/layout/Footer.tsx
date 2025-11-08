const CURRENT_YEAR = new Date().getFullYear()

export default function Footer() {
  return (
    <footer className="border-t">
      <div className="flex h-16 items-center justify-center px-6">
        <p className="text-sm text-muted-foreground">
          © {CURRENT_YEAR} Your Company. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
