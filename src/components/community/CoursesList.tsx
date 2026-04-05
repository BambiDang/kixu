'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import type { CourseWithContent } from '@/app/(app)/community/[slug]/courses/page'

type CourseModule = Database['public']['Tables']['course_modules']['Row']
type CourseLesson = Database['public']['Tables']['course_lessons']['Row']
type CourseDownload = Database['public']['Tables']['course_downloads']['Row']

interface Props {
  courses: CourseWithContent[]
  userRole: 'admin' | 'member'
  communityId: string
  userId: string
  enrolledIds: string[]
}

export default function CoursesList({ courses: initialCourses, userRole, communityId, userId, enrolledIds }: Props) {
  const supabase = createClient()
  const router = useRouter()
  const [courses, setCourses] = useState(initialCourses)
  const [enrolled, setEnrolled] = useState(new Set(enrolledIds))
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  // Create course form
  const [showCreate, setShowCreate] = useState(false)
  const [createTitle, setCreateTitle] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createCover, setCreateCover] = useState('')
  const [createPrice, setCreatePrice] = useState(0)
  const [createPublish, setCreatePublish] = useState(false)
  const [creating, setCreating] = useState(false)

  // Per-course edit state
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [editCover, setEditCover] = useState('')
  const [editPrice, setEditPrice] = useState(0)
  const [saving, setSaving] = useState(false)

  // Module/lesson/download add state
  const [addingModuleTo, setAddingModuleTo] = useState<string | null>(null)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingLessonTo, setAddingLessonTo] = useState<string | null>(null)
  const [newLessonTitle, setNewLessonTitle] = useState('')
  const [newLessonContent, setNewLessonContent] = useState('')
  const [newLessonVideo, setNewLessonVideo] = useState('')
  const [addingDownloadTo, setAddingDownloadTo] = useState<string | null>(null)
  const [newDownloadTitle, setNewDownloadTitle] = useState('')
  const [newDownloadUrl, setNewDownloadUrl] = useState('')
  const [newDownloadType, setNewDownloadType] = useState('')
  const [subSubmitting, setSubSubmitting] = useState(false)

  const [buyingId, setBuyingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function createCourse() {
    if (!createTitle.trim()) return
    setCreating(true)
    const { data, error: err } = await supabase.from('courses').insert({
      community_id: communityId,
      title: createTitle.trim(),
      description: createDesc.trim() || null,
      cover_image_url: createCover.trim() || null,
      price: Math.round(createPrice * 100),
      is_published: createPublish,
      position: courses.length,
    }).select('*, course_downloads(*), course_modules(*, course_lessons(*))').single()
    setCreating(false)
    if (err) { setError(err.message); return }
    setCourses((prev) => [...prev, data as unknown as CourseWithContent])
    setCreateTitle(''); setCreateDesc(''); setCreateCover(''); setCreatePrice(0); setCreatePublish(false)
    setShowCreate(false)
  }

  function startEdit(course: CourseWithContent) {
    setEditingId(course.id)
    setEditTitle(course.title)
    setEditDesc(course.description ?? '')
    setEditCover(course.cover_image_url ?? '')
    setEditPrice(course.price / 100)
  }

  async function saveEdit(courseId: string) {
    setSaving(true)
    const { error: err } = await supabase.from('courses').update({
      title: editTitle.trim(),
      description: editDesc.trim() || null,
      cover_image_url: editCover.trim() || null,
      price: Math.round(editPrice * 100),
    }).eq('id', courseId)
    setSaving(false)
    if (err) { setError(err.message); return }
    setCourses((prev) => prev.map((c) =>
      c.id === courseId ? { ...c, title: editTitle, description: editDesc || null, cover_image_url: editCover || null, price: Math.round(editPrice * 100) } : c
    ))
    setEditingId(null)
  }

  async function togglePublish(courseId: string, current: boolean) {
    await supabase.from('courses').update({ is_published: !current }).eq('id', courseId)
    setCourses((prev) => prev.map((c) => c.id === courseId ? { ...c, is_published: !current } : c))
  }

  async function deleteCourse(courseId: string) {
    if (!confirm('Delete this course and all its content?')) return
    await supabase.from('courses').delete().eq('id', courseId)
    setCourses((prev) => prev.filter((c) => c.id !== courseId))
  }

  async function addModule(courseId: string) {
    if (!newModuleTitle.trim()) return
    setSubSubmitting(true)
    const { data, error: err } = await supabase.from('course_modules').insert({
      course_id: courseId,
      title: newModuleTitle.trim(),
      position: courses.find((c) => c.id === courseId)?.course_modules.length ?? 0,
    }).select().single()
    setSubSubmitting(false)
    if (err) { setError(err.message); return }
    setCourses((prev) => prev.map((c) =>
      c.id === courseId ? { ...c, course_modules: [...c.course_modules, { ...data, course_lessons: [] }] } : c
    ))
    setNewModuleTitle(''); setAddingModuleTo(null)
  }

  async function deleteModule(courseId: string, moduleId: string) {
    await supabase.from('course_modules').delete().eq('id', moduleId)
    setCourses((prev) => prev.map((c) =>
      c.id === courseId ? { ...c, course_modules: c.course_modules.filter((m) => m.id !== moduleId) } : c
    ))
  }

  async function addLesson(courseId: string, moduleId: string) {
    if (!newLessonTitle.trim()) return
    setSubSubmitting(true)
    const module = courses.find((c) => c.id === courseId)?.course_modules.find((m) => m.id === moduleId)
    const { data, error: err } = await supabase.from('course_lessons').insert({
      module_id: moduleId,
      title: newLessonTitle.trim(),
      content: newLessonContent.trim() || null,
      video_url: newLessonVideo.trim() || null,
      position: module?.course_lessons.length ?? 0,
    }).select().single()
    setSubSubmitting(false)
    if (err) { setError(err.message); return }
    setCourses((prev) => prev.map((c) =>
      c.id !== courseId ? c : {
        ...c,
        course_modules: c.course_modules.map((m) =>
          m.id !== moduleId ? m : { ...m, course_lessons: [...m.course_lessons, data] }
        ),
      }
    ))
    setNewLessonTitle(''); setNewLessonContent(''); setNewLessonVideo(''); setAddingLessonTo(null)
  }

  async function deleteLesson(courseId: string, moduleId: string, lessonId: string) {
    await supabase.from('course_lessons').delete().eq('id', lessonId)
    setCourses((prev) => prev.map((c) =>
      c.id !== courseId ? c : {
        ...c,
        course_modules: c.course_modules.map((m) =>
          m.id !== moduleId ? m : { ...m, course_lessons: m.course_lessons.filter((l) => l.id !== lessonId) }
        ),
      }
    ))
  }

  async function addDownload(courseId: string) {
    if (!newDownloadTitle.trim() || !newDownloadUrl.trim()) return
    setSubSubmitting(true)
    const { data, error: err } = await supabase.from('course_downloads').insert({
      course_id: courseId,
      title: newDownloadTitle.trim(),
      url: newDownloadUrl.trim(),
      file_type: newDownloadType.trim() || null,
      position: courses.find((c) => c.id === courseId)?.course_downloads.length ?? 0,
    }).select().single()
    setSubSubmitting(false)
    if (err) { setError(err.message); return }
    setCourses((prev) => prev.map((c) =>
      c.id === courseId ? { ...c, course_downloads: [...c.course_downloads, data] } : c
    ))
    setNewDownloadTitle(''); setNewDownloadUrl(''); setNewDownloadType(''); setAddingDownloadTo(null)
  }

  async function deleteDownload(courseId: string, downloadId: string) {
    await supabase.from('course_downloads').delete().eq('id', downloadId)
    setCourses((prev) => prev.map((c) =>
      c.id === courseId ? { ...c, course_downloads: c.course_downloads.filter((d) => d.id !== downloadId) } : c
    ))
  }

  async function buyCourse(courseId: string) {
    setBuyingId(courseId)
    const res = await fetch('/api/stripe/create-course-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ courseId }),
    })
    const json = await res.json()
    setBuyingId(null)
    if (json.url) {
      window.location.href = json.url
    } else {
      setError(json.error ?? 'Failed to start checkout')
    }
  }

  const isAdmin = userRole === 'admin'
  const visibleCourses = isAdmin ? courses : courses.filter((c) => c.is_published)

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Courses</h2>
          <p className="text-sm text-gray-400 mt-0.5">Structured learning content</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            + Create course
          </button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 mb-4">{error}</p>}

      {/* Create form */}
      {showCreate && (
        <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">New course</h3>
          <input
            value={createTitle}
            onChange={(e) => setCreateTitle(e.target.value)}
            placeholder="Course title"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <textarea
            value={createDesc}
            onChange={(e) => setCreateDesc(e.target.value)}
            placeholder="Description (optional)"
            rows={2}
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
          <input
            value={createCover}
            onChange={(e) => setCreateCover(e.target.value)}
            placeholder="Cover image URL (optional)"
            className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-sm text-gray-500">$</span>
              <input
                type="number"
                min={0}
                step={1}
                value={createPrice}
                onChange={(e) => setCreatePrice(Number(e.target.value))}
                placeholder="0 = free"
                className="w-24 px-2 py-2 border border-gray-200 rounded-md text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-xs text-gray-400">0 = free for all members</span>
            </div>
            <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                checked={createPublish}
                onChange={(e) => setCreatePublish(e.target.checked)}
                className="rounded"
              />
              Publish immediately
            </label>
          </div>
          <div className="flex gap-2">
            <button
              onClick={createCourse}
              disabled={creating || !createTitle.trim()}
              className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
            <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-md">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {visibleCourses.length === 0 && !showCreate && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
            <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">
            {isAdmin ? 'No courses yet — create your first course' : 'No courses published yet'}
          </p>
        </div>
      )}

      {/* Course grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {visibleCourses.map((course) => {
          const isExpanded = expandedId === course.id
          const isEditing = editingId === course.id
          const isEnrolled = enrolled.has(course.id)
          const isFree = course.price === 0
          const canAccess = isFree || isEnrolled || isAdmin

          return (
            <div key={course.id} className="border border-gray-200 rounded-lg overflow-hidden bg-white">
              {/* Cover */}
              <div
                className={`relative h-36 flex items-end ${course.cover_image_url ? '' : 'bg-gradient-to-br from-blue-500 to-blue-700'}`}
                style={course.cover_image_url ? { backgroundImage: `url(${course.cover_image_url})`, backgroundSize: 'cover', backgroundPosition: 'center' } : {}}
              >
                <div className="absolute inset-0 bg-black/30" />
                <div className="relative px-4 pb-3 flex items-end justify-between w-full">
                  <div>
                    {isAdmin && !course.is_published && (
                      <span className="text-xs bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded font-medium mr-2">Draft</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isFree ? 'bg-green-100 text-green-800' : 'bg-white/90 text-gray-800'}`}>
                      {isFree ? 'Free' : `$${(course.price / 100).toFixed(0)}`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <textarea
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      value={editCover}
                      onChange={(e) => setEditCover(e.target.value)}
                      placeholder="Cover image URL"
                      className="w-full px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">$</span>
                      <input
                        type="number" min={0} value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        className="w-20 px-2 py-1 border border-gray-200 rounded text-sm focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => saveEdit(course.id)} disabled={saving}
                        className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60">
                        {saving ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 hover:text-gray-700">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-gray-900">{course.title}</h3>
                    {course.description && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{course.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {course.course_modules.length} module{course.course_modules.length !== 1 ? 's' : ''} ·{' '}
                      {course.course_modules.reduce((n, m) => n + m.course_lessons.length, 0)} lesson{course.course_modules.reduce((n, m) => n + m.course_lessons.length, 0) !== 1 ? 's' : ''}
                      {course.course_downloads.length > 0 && ` · ${course.course_downloads.length} download${course.course_downloads.length !== 1 ? 's' : ''}`}
                    </p>
                  </>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 mt-3">
                  {canAccess ? (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : course.id)}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      {isExpanded ? 'Collapse' : 'View course'}
                    </button>
                  ) : (
                    <button
                      onClick={() => buyCourse(course.id)}
                      disabled={buyingId === course.id}
                      className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60 transition-colors"
                    >
                      {buyingId === course.id ? 'Redirecting…' : `Buy course — $${(course.price / 100).toFixed(0)}`}
                    </button>
                  )}

                  {isAdmin && !isEditing && (
                    <>
                      <button onClick={() => startEdit(course)} className="text-xs text-gray-400 hover:text-gray-600">Edit</button>
                      <button onClick={() => togglePublish(course.id, course.is_published)}
                        className={`text-xs ${course.is_published ? 'text-gray-400 hover:text-gray-600' : 'text-green-600 hover:text-green-700'}`}>
                        {course.is_published ? 'Unpublish' : 'Publish'}
                      </button>
                      <button onClick={() => deleteCourse(course.id)} className="text-xs text-red-400 hover:text-red-600 ml-auto">Delete</button>
                    </>
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && canAccess && (
                <div className="border-t border-gray-100 px-4 pb-4 pt-3 space-y-4">
                  {/* Modules */}
                  {course.course_modules.length > 0 && (
                    <div className="space-y-3">
                      {course.course_modules.map((mod) => (
                        <div key={mod.id}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">{mod.title}</p>
                            {isAdmin && (
                              <div className="flex items-center gap-2">
                                <button onClick={() => { setAddingLessonTo(mod.id); setNewLessonTitle(''); setNewLessonContent(''); setNewLessonVideo('') }}
                                  className="text-xs text-blue-600 hover:underline">+ Lesson</button>
                                <button onClick={() => deleteModule(course.id, mod.id)} className="text-xs text-red-400 hover:text-red-600">Delete</button>
                              </div>
                            )}
                          </div>
                          {mod.course_lessons.map((lesson) => (
                            <LessonRow key={lesson.id} lesson={lesson} isAdmin={isAdmin}
                              onDelete={() => deleteLesson(course.id, mod.id, lesson.id)} />
                          ))}
                          {addingLessonTo === mod.id && (
                            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                              <input value={newLessonTitle} onChange={(e) => setNewLessonTitle(e.target.value)}
                                placeholder="Lesson title" autoFocus
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <textarea value={newLessonContent} onChange={(e) => setNewLessonContent(e.target.value)}
                                placeholder="Description (optional)" rows={2}
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white resize-none focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <input value={newLessonVideo} onChange={(e) => setNewLessonVideo(e.target.value)}
                                placeholder="Video URL (YouTube/Vimeo, optional)"
                                className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                              <div className="flex gap-2">
                                <button onClick={() => addLesson(course.id, mod.id)} disabled={subSubmitting || !newLessonTitle.trim()}
                                  className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60">
                                  {subSubmitting ? 'Adding…' : 'Add lesson'}
                                </button>
                                <button onClick={() => setAddingLessonTo(null)} className="text-xs text-gray-500">Cancel</button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add module (admin) */}
                  {isAdmin && (
                    <div>
                      {addingModuleTo === course.id ? (
                        <div className="flex items-center gap-2">
                          <input value={newModuleTitle} onChange={(e) => setNewModuleTitle(e.target.value)}
                            placeholder="Module title" autoFocus onKeyDown={(e) => e.key === 'Enter' && addModule(course.id)}
                            className="flex-1 px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <button onClick={() => addModule(course.id)} disabled={subSubmitting || !newModuleTitle.trim()}
                            className="px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60">
                            {subSubmitting ? 'Adding…' : 'Add'}
                          </button>
                          <button onClick={() => setAddingModuleTo(null)} className="text-xs text-gray-500">Cancel</button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingModuleTo(course.id)}
                          className="text-xs text-blue-600 hover:underline">+ Add module</button>
                      )}
                    </div>
                  )}

                  {/* Downloads */}
                  {(course.course_downloads.length > 0 || isAdmin) && (
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Downloads</p>
                        {isAdmin && (
                          <button onClick={() => { setAddingDownloadTo(course.id); setNewDownloadTitle(''); setNewDownloadUrl(''); setNewDownloadType('') }}
                            className="text-xs text-blue-600 hover:underline">+ Add</button>
                        )}
                      </div>
                      {course.course_downloads.map((dl) => (
                        <div key={dl.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group">
                          <a href={dl.url} target="_blank" rel="noreferrer"
                            className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            {dl.title}
                            {dl.file_type && <span className="text-xs text-gray-400 ml-1">({dl.file_type})</span>}
                          </a>
                          {isAdmin && (
                            <button onClick={() => deleteDownload(course.id, dl.id)}
                              className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Remove
                            </button>
                          )}
                        </div>
                      ))}
                      {addingDownloadTo === course.id && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200 space-y-2">
                          <input value={newDownloadTitle} onChange={(e) => setNewDownloadTitle(e.target.value)}
                            placeholder="File name" autoFocus
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <input value={newDownloadUrl} onChange={(e) => setNewDownloadUrl(e.target.value)}
                            placeholder="URL (Google Drive, Dropbox…)"
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <input value={newDownloadType} onChange={(e) => setNewDownloadType(e.target.value)}
                            placeholder="File type label (e.g. PDF, ZIP — optional)"
                            className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm bg-white focus:outline-none focus:ring-1 focus:ring-blue-500" />
                          <div className="flex gap-2">
                            <button onClick={() => addDownload(course.id)} disabled={subSubmitting || !newDownloadTitle.trim() || !newDownloadUrl.trim()}
                              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-60">
                              {subSubmitting ? 'Adding…' : 'Add download'}
                            </button>
                            <button onClick={() => setAddingDownloadTo(null)} className="text-xs text-gray-500">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function LessonRow({ lesson, isAdmin, onDelete }: { lesson: CourseLesson; isAdmin: boolean; onDelete: () => void }) {
  const [open, setOpen] = useState(false)

  function getVideoEmbedUrl(url: string): string | null {
    const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
    if (yt) return `https://www.youtube.com/embed/${yt[1]}`
    const vimeo = url.match(/vimeo\.com\/(\d+)/)
    if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`
    return null
  }

  return (
    <div className="border-b border-gray-50 last:border-0">
      <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-gray-50 group">
        <button onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm text-gray-700 flex-1 text-left">
          <svg className={`w-3 h-3 text-gray-400 transition-transform shrink-0 ${open ? 'rotate-90' : ''}`}
            fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">{lesson.title}</span>
          {lesson.video_url && (
            <span className="text-xs text-blue-400">▶</span>
          )}
        </button>
        {isAdmin && (
          <button onClick={onDelete}
            className="text-xs text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            Remove
          </button>
        )}
      </div>
      {open && (lesson.content || lesson.video_url) && (
        <div className="ml-7 mb-2 space-y-2">
          {lesson.video_url && (() => {
            const embed = getVideoEmbedUrl(lesson.video_url)
            return embed ? (
              <div className="aspect-video rounded overflow-hidden bg-black">
                <iframe src={embed} className="w-full h-full" allowFullScreen />
              </div>
            ) : (
              <a href={lesson.video_url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                Watch video →
              </a>
            )
          })()}
          {lesson.content && <p className="text-xs text-gray-600 whitespace-pre-line">{lesson.content}</p>}
        </div>
      )}
    </div>
  )
}
