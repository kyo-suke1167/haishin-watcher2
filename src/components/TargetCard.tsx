export default function TargetCard({ target, onClick }: { target: any, onClick?: () => void }) {
  const thumbnailUrl = `https://img.youtube.com/vi/${target.videoId}/hqdefault.jpg`;

  return (
    <div 
      onClick={onClick}
      className="bg-gray-800 border border-gray-700 rounded-xl overflow-hidden shadow-lg flex flex-col justify-between hover:border-blue-500 hover:shadow-[0_0_15px_rgba(37,99,235,0.2)] transition-all cursor-pointer relative"
    >
      {/* サムネイル画像 */}
      <div className="relative aspect-video">
        <img src={thumbnailUrl} alt="Thumbnail" className="w-full h-full object-cover" />
        <div className="absolute bottom-2 right-2 px-2 py-1 text-xs font-bold rounded-md bg-black/80 text-white shadow-sm border border-gray-600">
          {target.status === 'live' && <span className="text-red-400 flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>LIVE</span>}
          {target.status === 'waiting' && <span className="text-yellow-400">WAITING</span>}
          {target.status === 'completed' && <span className="text-gray-400">COMPLETED</span>}
        </div>
      </div>

      {/* テキスト情報 */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-sm font-bold text-gray-100 line-clamp-2 mb-2 leading-snug hover:text-blue-400 transition-colors">
          {target.title || target.videoId}
        </h3>
        <p className="text-xs text-gray-500 mt-auto flex items-center gap-1">
          <span>🕒</span> {new Date(target.createdAt).toLocaleDateString('ja-JP')} 登録
        </p>
      </div>
    </div>
  );
}