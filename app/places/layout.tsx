export default function PlacesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <a href="/places" className="text-2xl font-bold text-blue-600">
                MyScene
              </a>
            </div>
            <div className="flex items-center space-x-6">
              <a href="/places" className="text-gray-700 hover:text-gray-900">
                피드
              </a>
              <a href="/places/map" className="text-gray-700 hover:text-gray-900">
                지도
              </a>
            </div>
          </div>
        </div>
      </nav>
      {children}
    </div>
  );
}
