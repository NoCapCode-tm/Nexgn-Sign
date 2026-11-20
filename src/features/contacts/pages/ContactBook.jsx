import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Helmet } from 'react-helmet-async'
import {
  ChevronLeft,
  ChevronRight,
  CircleAlert,
  ListFilter,
  Plus,
  RefreshCw,
  Search,
  SearchX,
  Users,
  X,
} from 'lucide-react'
import { gsap } from 'gsap'
import { useGSAP } from '@gsap/react'
import clsx from 'clsx'

import Topbar from '@/components/layout/Topbar'
import Toast from '@/components/ui/Toast'
import ContactCard from '../components/ContactCard'
import AddContactForm from '../components/AddContactForm'
import ContactDetailsModal from '../components/ContactDetailsModal'
import { contactsService } from '@/services/contacts.service'
import { prefersReducedMotion } from '@/utils/motion'
import styles from './ContactBook.module.css'

gsap.registerPlugin(useGSAP)

const PAGE_SIZES = [10, 20, 50]
const GENDER_FILTERS = ['Male', 'Female', 'Other']
const STATUS_FILTERS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

/* ---------------- Filters popover ---------------- */
function FilterMenu({ filters, onChange, showStatus, count }) {
  const [open, setOpen] = useState(false)
  const wrap = useRef(null)
  const button = useRef(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return undefined
    const onDown = (e) => {
      if (!wrap.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false)
        button.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (key, value) => onChange({ ...filters, [key]: filters[key] === value ? '' : value })

  return (
    <div className={styles.filterWrap} ref={wrap} data-open={open}>
      <button
        ref={button}
        type="button"
        className={styles.filterBtn}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <ListFilter aria-hidden="true" />
        <span>Filters</span>
        {count > 0 && <b className={styles.filterCount}>{count}</b>}
      </button>

      <div id={menuId} className={styles.filterMenu} role="dialog" aria-label="Filter contacts">
        <fieldset className={styles.group}>
          <legend>Gender</legend>
          <div className={styles.chips}>
            {GENDER_FILTERS.map((g) => (
              <button key={g} type="button" className={styles.chip} aria-pressed={filters.gender === g} onClick={() => toggle('gender', g)}>
                {g}
              </button>
            ))}
          </div>
        </fieldset>

        {showStatus && (
          <fieldset className={styles.group}>
            <legend>Status</legend>
            <div className={styles.chips}>
              {STATUS_FILTERS.map(({ value, label }) => (
                <button key={value} type="button" className={styles.chip} aria-pressed={filters.status === value} onClick={() => toggle('status', value)}>
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        <div className={styles.menuFoot}>
          <button type="button" className={styles.clear} onClick={() => onChange({ gender: '', status: '' })} disabled={count === 0}>
            Clear
          </button>
          <button type="button" className={styles.done} onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- Page ---------------- */
export default function ContactBook() {
  const root = useRef(null)

  const [contacts, setContacts] = useState(null) // null = not loaded yet
  const [loadError, setLoadError] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState({ gender: '', status: '' })
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [details, setDetails] = useState({ open: false, contact: null })
  const [form, setForm] = useState({ open: false, mode: 'add', contact: null, key: 0 })
  const [toast, setToast] = useState(null)

  // Load from the API
  useEffect(() => {
    let active = true
    contactsService
      .list()
      .then((list) => active && setContacts(list))
      .catch((err) => active && setLoadError(err))
    return () => {
      active = false
    }
  }, [reloadKey])

  const loading = contacts === null && !loadError
  const all = useMemo(() => contacts ?? [], [contacts])
  const showStatus = useMemo(() => all.some((c) => c.status), [all])
  const activeFilters = (filters.gender ? 1 : 0) + (filters.status ? 1 : 0)
  const searching = query.trim() !== '' || activeFilters > 0

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return all.filter(
      (c) =>
        (!filters.gender || c.gender === filters.gender) &&
        (!filters.status || c.status === filters.status) &&
        (!q || [c.name, c.email, c.phone].some((v) => v.toLowerCase().includes(q))),
    )
  }, [all, filters, query])

  const total = filtered.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const current = Math.min(page, totalPages)
  const start = (current - 1) * perPage
  const rows = filtered.slice(start, start + perPage)

  // ---- Animations ----
  useGSAP(
    () => {
      if (prefersReducedMotion()) return
      gsap.fromTo(
        '[data-enter]',
        { y: 26, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.9, stagger: 0.08, delay: 0.15, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root },
  )

  // Rows stagger in when the data arrives or the page changes (not on every keystroke)
  useGSAP(
    () => {
      if (loading || prefersReducedMotion()) return
      gsap.fromTo(
        '[data-row]',
        { y: 14, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, stagger: 0.045, delay: 0.1, ease: 'power3.out', clearProps: 'transform,opacity,visibility' },
      )
    },
    { scope: root, dependencies: [loading, current, perPage] },
  )

  // ---- Toasts ----
  const showToast = useCallback((text, tone = 'ok') => setToast({ id: Date.now(), text, tone }), [])
  const clearToast = useCallback(() => setToast(null), [])

  // ---- Overlays ----
  const openDetails = (contact) => setDetails({ open: true, contact })
  const closeDetails = () => setDetails((d) => ({ ...d, open: false }))

  const openAdd = () => setForm((f) => ({ open: true, mode: 'add', contact: null, key: f.key + 1 }))
  const openEdit = (contact) => {
    closeDetails()
    setForm((f) => ({ open: true, mode: 'edit', contact, key: f.key + 1 }))
  }
  // Closing the edit form takes you back to the details
  const closeForm = () => {
    if (form.mode === 'edit' && form.contact) setDetails({ open: true, contact: form.contact })
    setForm((f) => ({ ...f, open: false }))
  }

  // ---- Saving (errors bubble up to the form) ----
  const syncFromServer = () => {
    contactsService
      .list()
      .then(setContacts)
      .catch(() => {})
  }

  const handleSave = async (values) => {
    if (form.mode === 'edit' && form.contact) {
      const id = form.contact.id
      const updated = await contactsService.update(id, values)
      setContacts((prev) => (prev ?? []).map((c) => (c.id === id ? updated : c)))
      setForm((f) => ({ ...f, open: false }))
      setDetails({ open: true, contact: updated })
      showToast('Contact updated')
    } else {
      const created = await contactsService.create(values)
      setContacts((prev) => [created, ...(prev ?? [])])
      setForm((f) => ({ ...f, open: false }))
      showToast('Contact added')
    }
    syncFromServer()
  }

  const handleDelete = async (contact) => {
    await contactsService.remove(contact.id)
    setContacts((prev) => (prev ?? []).filter((c) => c.id !== contact.id))
    setForm((f) => ({ ...f, open: false }))
    showToast('Contact deleted')
  }

  const clearAll = () => {
    setQuery('')
    setFilters({ gender: '', status: '' })
    setPage(1)
  }

  const showEmpty = !loading && rows.length === 0 && !(loadError && contacts === null)

  return (
    <div className={styles.page} ref={root}>
      <Helmet>
        <title>Contact Book | Nexgn</title>
      </Helmet>

      <Topbar title="Contact Book" subtitle="Manage all company contacts" showUpload={false} />

      {loadError && (
        <div className={styles.alert} role="alert">
          <CircleAlert aria-hidden="true" />
          <span>{loadError.userMessage || 'Could not load your contacts.'}</span>
          <button
            type="button"
            onClick={() => {
              setLoadError(null)
              setReloadKey((k) => k + 1)
            }}
          >
            <RefreshCw aria-hidden="true" /> Retry
          </button>
        </div>
      )}

      <div className={styles.toolbar} data-enter>
        <form className={styles.search} role="search" onSubmit={(e) => e.preventDefault()}>
          <Search className={styles.searchIcon} aria-hidden="true" />
          <input
            type="search"
            name="q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setPage(1)
            }}
            placeholder="Search contacts"
            autoComplete="off"
            aria-label="Search contacts"
          />
          {query && (
            <button type="button" className={styles.searchClear} onClick={() => setQuery('')} aria-label="Clear search">
              <X aria-hidden="true" />
            </button>
          )}
        </form>

        <FilterMenu
          filters={filters}
          onChange={(next) => {
            setFilters(next)
            setPage(1)
          }}
          showStatus={showStatus}
          count={activeFilters}
        />

        <button type="button" className={styles.add} onClick={openAdd}>
          <Plus aria-hidden="true" />
          <span>Add contact</span>
        </button>
      </div>

      <section className={styles.card} data-enter aria-labelledby="contacts-heading">
        <header className={styles.head}>
          <h2 id="contacts-heading" className={styles.title}>
            {searching ? 'Results' : 'All contacts'}
          </h2>
          {!loading && <span className={styles.count}>{total}</span>}
        </header>

        <ul className={styles.list} aria-busy={loading}>
          {loading &&
            Array.from({ length: 5 }, (_, i) => (
              <li key={i} className={styles.skel} aria-hidden="true">
                <i className={styles.skAvatar} />
                <span className={styles.skText}>
                  <b />
                  <b />
                </span>
              </li>
            ))}

          {!loading && rows.map((c) => <ContactCard key={c.id} contact={c} onOpen={openDetails} />)}
        </ul>

        {showEmpty && (
          <div className={styles.empty}>
            {all.length === 0 ? (
              <>
                <Users aria-hidden="true" />
                <strong>No contacts yet</strong>
                <span>Add the people you send documents to and they will show up here.</span>
                <button type="button" className={styles.emptyBtn} onClick={openAdd}>
                  <Plus aria-hidden="true" /> Add contact
                </button>
              </>
            ) : (
              <>
                <SearchX aria-hidden="true" />
                <strong>No matching contacts</strong>
                <span>Try a different name, e-mail or number, or clear the filters.</span>
                <button type="button" className={styles.emptyBtn} onClick={clearAll}>
                  Clear search and filters
                </button>
              </>
            )}
          </div>
        )}

        {!loading && total > PAGE_SIZES[0] && (
          <footer className={styles.pagination}>
            <label className={styles.pageSize}>
              <span>Rows per page:</span>
              <select
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value))
                  setPage(1)
                }}
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.pageNav}>
              <span className={styles.pageInfo}>
                {start + 1} – {Math.min(start + perPage, total)} of {total}
              </span>
              <button type="button" className={styles.pageBtn} disabled={current === 1} onClick={() => setPage(current - 1)} aria-label="Previous page">
                <ChevronLeft aria-hidden="true" />
              </button>
              <button type="button" className={styles.pageBtn} disabled={current === totalPages} onClick={() => setPage(current + 1)} aria-label="Next page">
                <ChevronRight aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}
      </section>

      <AddContactForm
        key={form.key}
        open={form.open}
        mode={form.mode}
        contact={form.contact}
        onClose={closeForm}
        onSubmit={handleSave}
        onDelete={handleDelete}
      />
      <ContactDetailsModal open={details.open} contact={details.contact} onClose={closeDetails} onEdit={openEdit} />

      <Toast toast={toast} onDone={clearToast} />
    </div>
  )
}