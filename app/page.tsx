export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-5xl font-bold text-gray-900">
          MyScene
        </h1>
        <p className="text-xl text-gray-600">
          사진 중심 여행 장소 추천 서비스
        </p>
        <p className="text-gray-500">
          프로젝트 설정 완료 - Phase 1 시작 준비됨
        </p>
        <div className="mt-8">
          <a
            href="/places"
            className="inline-block bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            장소 둘러보기
          </a>
        </div>
      </div>
    </div>
  );
}
