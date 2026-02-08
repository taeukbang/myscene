export default function PlacesFeed() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center space-y-4 py-16">
        <h2 className="text-3xl font-bold text-gray-900">
          Photo-first Place Feed
        </h2>
        <p className="text-gray-600">
          데이터베이스 설정 후 사진 카드가 여기에 표시됩니다
        </p>
        <div className="pt-8">
          <div className="inline-flex items-center space-x-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
            <span>Phase 1: 데이터베이스 마이그레이션 준비 중</span>
          </div>
        </div>
      </div>
    </div>
  );
}
