

interface DashboardLayoutProps {
  children: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen lg:h-screen flex bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden overflow-y-auto">
        {children}
      </div>
    </div>
  )
}

export default DashboardLayout