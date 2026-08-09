import { useEffect, useState, type FormEvent } from "react"
import { api } from "../api/endpoints"
import type { Profile } from "../api/types"
import { ErrorAlert } from "../components/ErrorAlert"

export function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [bio, setBio] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const p = await api.getProfileMe()
        if (!cancelled) {
          setProfile(p)
          setDisplayName(p.display_name)
          setBio(p.bio)
        }
      } catch (e) {
        if (!cancelled) setError(e)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const p = await api.putProfileMe({
        display_name: displayName,
        bio,
      })
      setProfile(p)
      setSaved(true)
    } catch (err) {
      setError(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-muted">Loading profile…</div>
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-7">
        <h1 className="h3 mb-3">Profile</h1>
        <p className="text-muted small">
          User-scoped API (<code>GET/PUT /api/profiles/me</code>). Gateway
          injects <code>X-User-Id</code>.
        </p>
        <ErrorAlert error={error} onDismiss={() => setError(null)} />
        {saved && (
          <div className="alert alert-success py-2">Saved.</div>
        )}
        <form onSubmit={(e) => void onSubmit(e)} className="card card-body">
          {profile && (
            <div className="mb-3">
              <label className="form-label text-muted small">User ID</label>
              <div className="font-monospace small">{profile.user_id}</div>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label" htmlFor="display_name">
              Display name
            </label>
            <input
              id="display_name"
              className="form-control"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              maxLength={255}
            />
          </div>
          <div className="mb-3">
            <label className="form-label" htmlFor="bio">
              Bio
            </label>
            <textarea
              id="bio"
              className="form-control"
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={2000}
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      </div>
    </div>
  )
}
