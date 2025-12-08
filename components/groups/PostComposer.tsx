'use client'

import { useState } from 'react'
import { Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { POST_SIDES } from '@/lib/constants'
import { notifyNewPost } from '@/lib/utils/notifications'

interface PostComposerProps {
  groupId: string
  currentUserId: string
  onPostCreated?: () => void
}

/**
 * 投稿作成コンポーネント
 * textarea + 送信ボタン
 */
export default function PostComposer({
  groupId,
  currentUserId,
  onPostCreated,
}: PostComposerProps) {
  const [content, setContent] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!content.trim() || isSubmitting) return

    setIsSubmitting(true)
    try {
      const supabase = createClient()
      const { data: post, error } = await supabase
        .from('posts')
        .insert({
          group_id: groupId,
          author_id: currentUserId,
          side: POST_SIDES.CARE, // v1では介護側のみ
          body: content.trim(),
        })
        .select()
        .single()

      if (error) {
        console.error('Failed to create post:', error)
        alert('投稿の作成に失敗しました。')
        return
      }

      // 通知を送信（モック）
      if (post) {
        const { data: groupData } = await supabase
          .from('groups')
          .select('name, facility_id')
          .eq('id', groupId)
          .single()

        if (groupData) {
          const { data: authorData } = await supabase
            .from('users')
            .select('display_name')
            .eq('id', currentUserId)
            .single()

          await notifyNewPost(
            post.id,
            groupData.facility_id,
            authorData?.display_name || '不明なユーザー',
            content.trim(),
            'group',
            groupData.name
          )
        }
      }

      // 成功したらテキストをクリア
      setContent('')

      // 親コンポーネントに通知
      if (onPostCreated) {
        onPostCreated()
      }
    } catch (error) {
      console.error('Failed to create post:', error)
      alert('投稿の作成に失敗しました。')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd/Ctrl + Enter で送信
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="今日の様子や連絡事項を共有できます..."
        rows={4}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
      />
      <div className="flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!content.trim() || isSubmitting}
          className="px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          <Send size={18} />
          {isSubmitting ? '送信中...' : '送信'}
        </button>
      </div>
    </div>
  )
}




