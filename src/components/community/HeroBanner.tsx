interface Props {
  name: string
  description: string | null
  coverImageUrl: string | null
}

export default function HeroBanner({ name, description, coverImageUrl }: Props) {
  return (
    <div
      className="relative w-full h-32 flex items-end overflow-hidden bg-gradient-to-r from-blue-600 to-blue-400"
      style={coverImageUrl ? {
        backgroundImage: `url(${coverImageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      } : undefined}
    >
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/40" />
      {/* Text */}
      <div className="relative z-10 px-5 pb-4">
        <h2 className="text-white font-bold text-lg leading-tight">{name}</h2>
        {description && (
          <p className="text-white/80 text-xs mt-0.5 line-clamp-1">{description}</p>
        )}
      </div>
    </div>
  )
}
