import Image from 'next/image'

interface LogoProps {
  /**
   * ロゴのサイズバリアント
   * - 'large': ログイン画面など、大きく表示する場合（デフォルト）
   * - 'medium': Headerなど、中程度のサイズ
   */
  variant?: 'large' | 'medium'
}

/**
 * アプリ内表示用ロゴ（横長・文字あり）
 * アプリ内の各画面で使用されるロゴコンポーネント
 */
export default function Logo({ variant = 'large' }: LogoProps) {
  const sizeClasses = {
    large: {
      width: 1024,
      height: 1024,
      className: 'h-32 w-auto max-w-md',
    },
    medium: {
      width: 1024,
      height: 1024,
      className: 'h-10 w-auto max-w-xs',
    },
  }

  const size = sizeClasses[variant]

  return (
    <div className="flex items-center">
      <Image
        src="/assets/logo/logo-app-light.png"
        alt="CareBridge Hub"
        width={size.width}
        height={size.height}
        priority
        sizes="(max-width: 768px) 320px, 400px"
        className={size.className}
      />
    </div>
  )
}


