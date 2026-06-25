'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import styles from './page.module.css'

type SortDir = 'asc' | 'desc'

interface Book {
  notice_id: number
  tit1: string
  year?: string
  code: string
  is_active?: boolean
}

interface User {
  id_empr: number
  empr_nom: string
  empr_prenom?: string
  empr_cb?: string
  empr_mail?: string
  empr_tel1?: string
  is_active?: boolean
  user_groups?: string
}

interface Loan {
  pret_id: number
  pret_date: string
  pret_retour?: string
  pret_idexpl: number
  pret_idempr: number
  cpt_prolongation: number
  tit1: string
  empr_nom: string
  empr_prenom?: string
  expl_cb?: string
  borrower_groups?: string
}

interface AvailableCopy {
  expl_id: number
  expl_cb: string
  notice_id: number
  tit1: string
}

interface BookCopy {
  expl_id: number
  expl_cb: string
  expl_statut: string
  expl_notice?: number
}

interface PaginationMeta {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

interface SessionUser {
  id: number
  username: string
  role: 'admin' | 'staff'
}

interface AppSetting {
  key_name: string
  key_value: string
  description: string
}

interface ConfigUser {
  id: number
  username: string
  role: 'admin' | 'staff'
  created_at: string
}

interface Statistics {
  totalBooks: number
  totalCopies: number
  totalUsers: number
  activeLoans: number
  overdueLoans: number
}

interface TopBook {
  notice_id: number
  tit1: string
  loan_count: number
}

interface TopBorrower {
  id_empr: number
  empr_nom: string
  empr_prenom: string | null
  active_loan_count: number
}

type Tab = 'books' | 'users' | 'groups' | 'loans' | 'config' | 'stats'

const initialPagination: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
}

export default function Home() {
  const explCbRef = useRef<HTMLInputElement>(null)
  const [session, setSession] = useState<SessionUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  const [activeTab, setActiveTab] = useState<Tab>('books')
  const [booksLoading, setBooksLoading] = useState(false)
  const [usersLoading, setUsersLoading] = useState(false)
  const [loansLoading, setLoansLoading] = useState(false)
  const [configLoading, setConfigLoading] = useState(false)
  const [statsLoading, setStatsLoading] = useState(false)

  const [books, setBooks] = useState<Book[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loans, setLoans] = useState<Loan[]>([])

  const [booksPagination, setBooksPagination] = useState<PaginationMeta>(initialPagination)
  const [usersPagination, setUsersPagination] = useState<PaginationMeta>(initialPagination)
  const [loansPagination, setLoansPagination] = useState<PaginationMeta>(initialPagination)

  const [bookSortBy, setBookSortBy] = useState<'notice_id' | 'tit1' | 'year' | 'code'>('tit1')
  const [bookSortDir, setBookSortDir] = useState<SortDir>('asc')
  const [userSortBy, setUserSortBy] = useState<
    'id_empr' | 'empr_cb' | 'empr_nom' | 'empr_prenom' | 'empr_mail' | 'empr_tel1'
  >('empr_nom')
  const [userSortDir, setUserSortDir] = useState<SortDir>('asc')
  const [loanSortBy, setLoanSortBy] = useState<
    'pret_id' | 'pret_date' | 'pret_retour' | 'tit1' | 'empr_nom'
  >('pret_date')
  const [loanSortDir, setLoanSortDir] = useState<SortDir>('desc')

  const [bookQuery, setBookQuery] = useState('')
  const [userQuery, setUserQuery] = useState('')
  const [includeInactiveBooks, setIncludeInactiveBooks] = useState(false)
  const [includeInactiveUsers, setIncludeInactiveUsers] = useState(false)

  const [loanFilters, setLoanFilters] = useState({
    borrower: '',
    book: '',
    dateFrom: '',
    dateTo: '',
    activeOnly: false,
    groupId: ''
  })

  const [newBook, setNewBook] = useState({ tit1: '', year: '', code: '' })
  const [newUser, setNewUser] = useState({
    empr_nom: '',
    empr_prenom: '',
    empr_cb: '',
    empr_mail: '',
    empr_tel1: ''
  })

  // Nuevo préstamo
  const [newLoan, setNewLoan] = useState({ expl_cb: '', id_empr: '' })
  const [loanUserQuery, setLoanUserQuery] = useState('')
  const [loanUserResults, setLoanUserResults] = useState<User[]>([])
  const [loanCopyQuery, setLoanCopyQuery] = useState('')
  const [loanCopyResults, setLoanCopyResults] = useState<AvailableCopy[]>([])
  const [loanFeedback, setLoanFeedback] = useState('')
  const [maxRenewals, setMaxRenewals] = useState(2)

  const [groups, setGroups] = useState<{ id_groupe: number; libelle_groupe: string }[]>([])
  const [userGroupFilter, setUserGroupFilter] = useState('')
  const [loanUserGroupFilter, setLoanUserGroupFilter] = useState('')

  const [selectedGroup, setSelectedGroup] = useState<number | null>(null)
  const [selectedGroupUsers, setSelectedGroupUsers] = useState<User[]>([])
  const [selectedGroupLoading, setSelectedGroupLoading] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [groupUsersSearchQuery, setGroupUsersSearchQuery] = useState('')
  const [groupUsersSearchResults, setGroupUsersSearchResults] = useState<User[]>([])

  const [settings, setSettings] = useState<AppSetting[]>([])
  const [settingsMessage, setSettingsMessage] = useState('')
  const [configUsers, setConfigUsers] = useState<ConfigUser[]>([])
  const [configUsersPagination, setConfigUsersPagination] = useState<PaginationMeta>({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1
  })
  const [newConfigUser, setNewConfigUser] = useState({
    username: '',
    password: '',
    role: 'staff' as 'admin' | 'staff'
  })

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loginSubmitting, setLoginSubmitting] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  const [editingBook, setEditingBook] = useState<Book | null>(null)
  const [editingBookForm, setEditingBookForm] = useState({ tit1: '', year: '', code: '' })

  const [editingUser, setEditingUser] = useState<User | null>(null)

  const [createdBookBarcode, setCreatedBookBarcode] = useState('')
  const [showCreatedBookAlert, setShowCreatedBookAlert] = useState(false)

  const [showCopiesModal, setShowCopiesModal] = useState(false)
  const [copiesModalBook, setCopiesModalBook] = useState<Book | null>(null)
  const [copiesList, setCopiesList] = useState<BookCopy[]>([])
  const [copiesLoading, setCopiesLoading] = useState(false)

  const [printBarcodeValue, setPrintBarcodeValue] = useState('')
  const [printBarcodeTitle, setPrintBarcodeTitle] = useState('')
  const [editingUserForm, setEditingUserForm] = useState({
    empr_nom: '',
    empr_prenom: '',
    empr_cb: '',
    empr_mail: '',
    empr_tel1: ''
  })

  const [stats, setStats] = useState<Statistics | null>(null)
  const [topBooks, setTopBooks] = useState<TopBook[]>([])
  const [topBorrowers, setTopBorrowers] = useState<TopBorrower[]>([])
  const [statsError, setStatsError] = useState('')

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          setSession(null)
          return
        }
        const data = await res.json()
        setSession(data.data)
      } finally {
        setAuthLoading(false)
      }
    }
    check()
  }, [])

  useEffect(() => {
    if (!session) return
    const fetchGroups = async () => {
      try {
        const res = await fetch('/api/groups')
        const data = await res.json()
        if (data.success) {
          setGroups(data.data || [])
        }
      } catch (error) {
        console.error('Error loading groups:', error)
      }
    }
    fetchGroups()
  }, [session])

  useEffect(() => {
    if (!session || activeTab !== 'groups' || selectedGroup === null) {
      setSelectedGroupUsers([])
      return
    }
    const loadGroupUsers = async () => {
      setSelectedGroupLoading(true)
      try {
        const res = await fetch(`/api/users?groupId=${selectedGroup}&pageSize=200`)
        const data = await res.json()
        if (data.success) {
          setSelectedGroupUsers(data.data || [])
        }
      } catch (error) {
        console.error('Error loading group users:', error)
      } finally {
        setSelectedGroupLoading(false)
      }
    }
    loadGroupUsers()
  }, [session, activeTab, selectedGroup, refreshKey])

  useEffect(() => {
    if (!session || activeTab !== 'books') return
    let cancelled = false
    const load = async () => {
      setBooksLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(booksPagination.page),
          pageSize: String(booksPagination.pageSize),
          sortBy: bookSortBy,
          sortDir: bookSortDir,
          includeInactive: String(includeInactiveBooks)
        })
        if (bookQuery) {
          params.set('q', bookQuery)
        }
        const res = await fetch(`/api/books?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        setBooks(data.data || [])
        if (data.pagination) {
          setBooksPagination(data.pagination)
        }
      } catch (error) {
        console.error('Error loading books:', error)
      } finally {
        if (!cancelled) setBooksLoading(false)
      }
    }
    const timer = setTimeout(load, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    session,
    activeTab,
    booksPagination.page,
    booksPagination.pageSize,
    bookSortBy,
    bookSortDir,
    bookQuery,
    includeInactiveBooks,
    refreshKey
  ])

  useEffect(() => {
    if (!session || activeTab !== 'users') return
    let cancelled = false
    const load = async () => {
      setUsersLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(usersPagination.page),
          pageSize: String(usersPagination.pageSize),
          sortBy: userSortBy,
          sortDir: userSortDir,
          includeInactive: String(includeInactiveUsers)
        })
        if (userQuery) {
          params.set('q', userQuery)
        }
        if (userGroupFilter) {
          params.set('groupId', userGroupFilter)
        }
        const res = await fetch(`/api/users?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        setUsers(data.data || [])
        if (data.pagination) {
          setUsersPagination(data.pagination)
        }
      } catch (error) {
        console.error('Error loading users:', error)
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    }
    const timer = setTimeout(load, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    session,
    activeTab,
    usersPagination.page,
    usersPagination.pageSize,
    userSortBy,
    userSortDir,
    userQuery,
    userGroupFilter,
    includeInactiveUsers,
    refreshKey
  ])

  useEffect(() => {
    if (!session || activeTab !== 'loans') return
    let cancelled = false
    const load = async () => {
      setLoansLoading(true)
      try {
        const params = new URLSearchParams({
          page: String(loansPagination.page),
          pageSize: String(loansPagination.pageSize),
          sortBy: loanSortBy,
          sortDir: loanSortDir,
          activeOnly: String(loanFilters.activeOnly)
        })
        if (loanFilters.borrower) {
          params.set('borrower', loanFilters.borrower)
        }
        if (loanFilters.book) {
          params.set('book', loanFilters.book)
        }
        if (loanFilters.dateFrom) {
          params.set('dateFrom', loanFilters.dateFrom)
        }
        if (loanFilters.dateTo) {
          params.set('dateTo', loanFilters.dateTo)
        }
        if (loanFilters.groupId) {
          params.set('groupId', loanFilters.groupId)
        }
        const res = await fetch(`/api/loans?${params.toString()}`)
        const data = await res.json()
        if (cancelled) return
        setLoans(data.data || [])
        if (data.pagination) {
          setLoansPagination(data.pagination)
        }
      } catch (error) {
        console.error('Error loading loans:', error)
      } finally {
        if (!cancelled) setLoansLoading(false)
      }
    }
    const timer = setTimeout(load, 250)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [
    session,
    activeTab,
    loansPagination.page,
    loansPagination.pageSize,
    loanSortBy,
    loanSortDir,
    loanFilters.activeOnly,
    loanFilters.borrower,
    loanFilters.book,
    loanFilters.dateFrom,
    loanFilters.dateTo,
    loanFilters.groupId,
    refreshKey
  ])

  useEffect(() => {
    if (!session || activeTab !== 'loans') return
    let cancelled = false
    const load = async () => {
      try {
        const srRes = await fetch('/api/config/settings')
        const srData = await srRes.json()
        if (cancelled) return
        if (srData.success) {
          const mr = srData.data.find((s: AppSetting) => s.key_name === 'max_renewals')
          if (mr) setMaxRenewals(parseInt(mr.key_value, 10))
        }
      } catch {
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session, activeTab])

  useEffect(() => {
    if (!session || activeTab !== 'config') return
    let cancelled = false
    const load = async () => {
      setConfigLoading(true)
      try {
        const [settingsRes, cfgUsersRes] = await Promise.all([
          fetch('/api/config/settings'),
          fetch(
            `/api/config/users?page=${configUsersPagination.page}&pageSize=${configUsersPagination.pageSize}`
          )
        ])
        const settingsData = await settingsRes.json()
        if (cancelled) return
        if (settingsData.success) {
          setSettings(settingsData.data)
        }
        const cfgUsersData = await cfgUsersRes.json()
        if (cancelled) return
        if (cfgUsersData.success) {
          setConfigUsers(cfgUsersData.data)
          setConfigUsersPagination(cfgUsersData.pagination)
        }
      } catch (error) {
        console.error('Error loading config:', error)
      } finally {
        if (!cancelled) setConfigLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session, activeTab, configUsersPagination.page, configUsersPagination.pageSize, refreshKey])

  useEffect(() => {
    if (!session || activeTab !== 'stats') return
    let cancelled = false
    const load = async () => {
      setStatsLoading(true)
      try {
        const statsRes = await fetch('/api/statistics')
        const statsData = await statsRes.json()
        if (cancelled) return
        if (statsData.success) {
          setStats(statsData.data.stats)
          setTopBooks(statsData.data.topBooks)
          setTopBorrowers(statsData.data.topBorrowers)
          setStatsError('')
        } else {
          setStatsError(statsData.error || 'Error al cargar estadisticas')
        }
      } catch (error) {
        console.error('Error loading stats:', error)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [session, activeTab, refreshKey])

  const sortArrow = (active: boolean, dir: SortDir) => {
    if (!active) {
      return ' ↕'
    }
    return dir === 'asc' ? ' ↑' : ' ↓'
  }

  const toggleSort = <T extends string>(
    currentBy: T,
    currentDir: SortDir,
    setBy: (value: T) => void,
    setDir: (value: SortDir) => void,
    clickedBy: T
  ) => {
    if (currentBy === clickedBy) {
      setDir(currentDir === 'asc' ? 'desc' : 'asc')
      return
    }
    setBy(clickedBy)
    setDir('asc')
  }

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (loginSubmitting) return
    setLoginSubmitting(true)
    setLoginError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setLoginError(data.error || 'Credenciales incorrectas')
        return
      }

      setSession(data.data)
      setUsername('')
      setPassword('')
    } finally {
      setLoginSubmitting(false)
    }
  }

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
    }
    setSession(null)
  }

  const searchLoanUsers = async () => {
    if (!loanUserQuery.trim() && !loanUserGroupFilter) return
    const params = new URLSearchParams({
      pageSize: '10'
    })
    if (loanUserQuery.trim()) {
      params.set('q', loanUserQuery)
    }
    if (loanUserGroupFilter) {
      params.set('groupId', loanUserGroupFilter)
    }
    const res = await fetch(`/api/users?${params.toString()}`)
    const data = await res.json()
    setLoanUserResults(data.data || [])
  }

  const searchLoanCopies = async () => {
    if (!loanCopyQuery.trim()) return
    const res = await fetch(`/api/books/copies?q=${encodeURIComponent(loanCopyQuery)}`)
    const data = await res.json()
    setLoanCopyResults(data.data || [])
  }

  const handleDetailsToggle = (e: React.SyntheticEvent<HTMLDetailsElement>) => {
    if (e.currentTarget.open) {
      setTimeout(() => {
        explCbRef.current?.focus()
      }, 50)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGroupName.trim()) return
    const res = await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ libelle: newGroupName })
    })
    const data = await res.json()
    if (data.success) {
      setNewGroupName('')
      setRefreshKey(k => k + 1)
      const gRes = await fetch('/api/groups')
      const gData = await gRes.json()
      if (gData.success) setGroups(gData.data || [])
    } else {
      alert(data.error || 'Error al crear grupo')
    }
  }

  const handleRenameGroup = async (id: number, currentLibelle: string) => {
    const libelle = prompt('Nuevo nombre del grupo:', currentLibelle)
    if (libelle === null || !libelle.trim() || libelle.trim() === currentLibelle) return
    const res = await fetch(`/api/groups/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ libelle })
    })
    const data = await res.json()
    if (data.success) {
      setRefreshKey(k => k + 1)
      const gRes = await fetch('/api/groups')
      const gData = await gRes.json()
      if (gData.success) setGroups(gData.data || [])
    } else {
      alert(data.error || 'Error al renombrar grupo')
    }
  }

  const handleDeleteGroup = async (id: number, name: string) => {
    if (!confirm(`¿Seguro que deseas eliminar el grupo "${name}"?\nEsta acción desasociará a todos los alumnos del grupo.`)) return
    const res = await fetch(`/api/groups/${id}`, {
      method: 'DELETE'
    })
    const data = await res.json()
    if (data.success) {
      if (selectedGroup === id) setSelectedGroup(null)
      setRefreshKey(k => k + 1)
      const gRes = await fetch('/api/groups')
      const gData = await gRes.json()
      if (gData.success) setGroups(gData.data || [])
    } else {
      alert(data.error || 'Error al eliminar grupo')
    }
  }

  const handleSearchGroupUsers = async () => {
    if (!groupUsersSearchQuery.trim()) return
    const res = await fetch(`/api/users?q=${encodeURIComponent(groupUsersSearchQuery)}&pageSize=10`)
    const data = await res.json()
    setGroupUsersSearchResults(data.data || [])
  }

  const handleAddUserToGroup = async (userId: number) => {
    if (selectedGroup === null) return
    const res = await fetch(`/api/groups/${selectedGroup}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId })
    })
    const data = await res.json()
    if (data.success) {
      setGroupUsersSearchQuery('')
      setGroupUsersSearchResults([])
      setRefreshKey(k => k + 1)
    } else {
      alert(data.error || 'Error al agregar alumno al grupo')
    }
  }

  const handleRemoveUserFromGroup = async (userId: number) => {
    if (selectedGroup === null) return
    if (!confirm('¿Seguro que deseas quitar a este usuario del grupo?')) return
    const res = await fetch(`/api/groups/${selectedGroup}/members?userId=${userId}`, {
      method: 'DELETE'
    })
    const data = await res.json()
    if (data.success) {
      setRefreshKey(k => k + 1)
    } else {
      alert(data.error || 'Error al remover alumno del grupo')
    }
  }

  const createLoan = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoanFeedback('')
    const res = await fetch('/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ expl_cb: newLoan.expl_cb, id_empr: parseInt(newLoan.id_empr, 10) })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setLoanFeedback('Error: ' + (data.error || 'No se pudo registrar'))
      return
    }
    setLoanFeedback('Prestamo registrado correctamente')
    setNewLoan({ expl_cb: '', id_empr: '' })
    setLoanUserResults([])
    setLoanCopyResults([])
    setLoanCopyQuery('')
    setLoanUserQuery('')
    setLoansPagination(prev => ({ ...prev, page: 1 }))
  }

  const doReturnLoan = async (explId: number) => {
    if (!confirm('Confirmar devolucion del ejemplar?')) return
    const res = await fetch(`/api/loans/${explId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'return' })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setLoanFeedback('Error: ' + (data.error || 'No se pudo devolver'))
      return
    }
    setLoanFeedback('Devuelto correctamente')
    setRefreshKey(k => k + 1)
  }

  const doRenewLoan = async (explId: number) => {
    const res = await fetch(`/api/loans/${explId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'renew' })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setLoanFeedback('Error: ' + (data.error || 'No se pudo renovar'))
      return
    }
    setLoanFeedback('Renovado hasta ' + (data.data?.retourStr || ''))
    setRefreshKey(k => k + 1)
  }

  const createBook = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newBook)
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      alert(data.error || 'No se pudo crear libro')
      return
    }

    if (data.data && data.data.expl_cb) {
      setCreatedBookBarcode(data.data.expl_cb)
      setPrintBarcodeValue(data.data.expl_cb)
      setPrintBarcodeTitle(newBook.tit1)
      setShowCreatedBookAlert(true)
    }

    setNewBook({ tit1: '', year: '', code: '' })
    setBooksPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleViewCopies = async (book: Book) => {
    setCopiesModalBook(book)
    setShowCopiesModal(true)
    setCopiesLoading(true)
    setCopiesList([])
    try {
      const res = await fetch(`/api/books/${book.notice_id}`)
      const data = await res.json()
      if (data.success && data.data) {
        setCopiesList(data.data.copies || [])
      } else {
        alert(data.error || 'Error al cargar ejemplares')
      }
    } catch (e) {
      console.error('Error loading copies:', e)
    } finally {
      setCopiesLoading(false)
    }
  }

  const createUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      alert(data.error || 'No se pudo crear usuario')
      return
    }
    setNewUser({ empr_nom: '', empr_prenom: '', empr_cb: '', empr_mail: '', empr_tel1: '' })
    setUsersPagination(prev => ({ ...prev, page: 1 }))
  }

  const patchBook = async (id: number, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/books/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      alert(data.error || 'No se pudo actualizar libro')
      return false
    }
    return true
  }

  const patchUser = async (id: number, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      alert(data.error || 'No se pudo actualizar usuario')
      return false
    }
    return true
  }

  const editBook = (book: Book) => {
    setEditingBook(book)
    setEditingBookForm({
      tit1: book.tit1,
      year: book.year || '',
      code: book.code || ''
    })
  }

  const handleSaveBook = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingBook) return
    const ok = await patchBook(editingBook.notice_id, editingBookForm)
    if (ok) {
      setEditingBook(null)
      setRefreshKey(k => k + 1)
    }
  }

  const editUser = (user: User) => {
    setEditingUser(user)
    setEditingUserForm({
      empr_nom: user.empr_nom,
      empr_prenom: user.empr_prenom || '',
      empr_cb: user.empr_cb || '',
      empr_mail: user.empr_mail || '',
      empr_tel1: user.empr_tel1 || ''
    })
  }

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    const ok = await patchUser(editingUser.id_empr, editingUserForm)
    if (ok) {
      setEditingUser(null)
      setRefreshKey(k => k + 1)
    }
  }

  const saveSettings = async () => {
    setSettingsMessage('Guardando...')
    const res = await fetch('/api/config/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        settings: settings.map(s => ({ key_name: s.key_name, key_value: s.key_value }))
      })
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      setSettingsMessage(data.error || 'Error guardando')
      return
    }
    setSettingsMessage('Guardado')
  }

  const createConfigUser = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('/api/config/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfigUser)
    })
    const data = await res.json()
    if (!res.ok || !data.success) {
      alert(data.error || 'Error creando usuario de acceso')
      return
    }
    setNewConfigUser({ username: '', password: '', role: 'staff' })
    setConfigUsersPagination(prev => ({ ...prev, page: 1 }))
  }

  const paginator = (
    meta: PaginationMeta,
    setMeta: React.Dispatch<React.SetStateAction<PaginationMeta>>
  ) => (
    <div className={styles.paginationBar}>
      <button
        onClick={() => setMeta(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
        disabled={meta.page <= 1}
      >
        ←
      </button>
      <span>
        Pagina {meta.page}/{meta.totalPages} · Total {meta.total}
      </span>
      <button
        onClick={() =>
          setMeta(prev => ({ ...prev, page: Math.min(prev.totalPages, prev.page + 1) }))
        }
        disabled={meta.page >= meta.totalPages}
      >
        →
      </button>
      <select
        value={meta.pageSize}
        onChange={(e) => setMeta(prev => ({ ...prev, page: 1, pageSize: Number(e.target.value) }))}
      >
        <option value={10}>10</option>
        <option value={20}>20</option>
        <option value={50}>50</option>
        <option value={100}>100</option>
      </select>
    </div>
  )

  if (authLoading) {
    return <div className={styles.loadingScreen}>Comprobando sesion...</div>
  }

  if (!session) {
    return (
      <div className={styles.loginContainer}>
        <form className={styles.loginCard} onSubmit={doLogin}>
          <h1>Acceso a Biblioteca</h1>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Usuario"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contrasena"
            required
          />
          {loginError && <p className={styles.errorText}>{loginError}</p>}
          <button type="submit" disabled={loginSubmitting}>
            {loginSubmitting ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>Gestion de Biblioteca</h1>
        <p>
          Sesion: <strong>{session.username}</strong> ({session.role})
        </p>
      </header>

      <nav className={styles.nav}>
        <button className={`${styles.navButton} ${activeTab === 'books' ? styles.active : ''}`} onClick={() => setActiveTab('books')}>
          Libros
        </button>
        <button className={`${styles.navButton} ${activeTab === 'users' ? styles.active : ''}`} onClick={() => setActiveTab('users')}>
          Usuarios
        </button>
        <button className={`${styles.navButton} ${activeTab === 'groups' ? styles.active : ''}`} onClick={() => setActiveTab('groups')}>
          Grupos
        </button>
        <button className={`${styles.navButton} ${activeTab === 'loans' ? styles.active : ''}`} onClick={() => setActiveTab('loans')}>
          Prestamos
        </button>
        <button className={`${styles.navButton} ${activeTab === 'config' ? styles.active : ''}`} onClick={() => setActiveTab('config')}>
          Configuracion
        </button>
        <button className={`${styles.navButton} ${activeTab === 'stats' ? styles.active : ''}`} onClick={() => setActiveTab('stats')}>
          Estadisticas
        </button>
        <button className={styles.logoutButton} onClick={logout}>Salir</button>
      </nav>

      <main className={styles.content}>
        {activeTab === 'books' && (
          <section>
            <h2>Libros</h2>

            <form className={styles.inlineForm} onSubmit={createBook}>
              <input placeholder="Titulo" value={newBook.tit1} onChange={(e) => setNewBook(prev => ({ ...prev, tit1: e.target.value }))} required />
              <input placeholder="Ano" value={newBook.year} onChange={(e) => setNewBook(prev => ({ ...prev, year: e.target.value }))} />
              <input placeholder="Codigo" value={newBook.code} onChange={(e) => setNewBook(prev => ({ ...prev, code: e.target.value }))} required />
              <button type="submit">+ Libro</button>
            </form>

            {showCreatedBookAlert && (
              <div className={styles.successText} style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem', padding: '1rem', background: '#ecfdf5', borderRadius: 'var(--radius)', border: '1px solid #a7f3d0' }}>
                <span style={{ color: '#065f46' }}>Libro creado con éxito. Copia generada con código de barras: <strong>{createdBookBarcode}</strong></span>
                <button
                  type="button"
                  onClick={() => {
                    setTimeout(() => window.print(), 50)
                  }}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', background: 'var(--success)', border: 'none', borderRadius: 'var(--radius)', color: 'white' }}
                >
                  Imprimir Código de Barras
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreatedBookAlert(false)}
                  style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', boxShadow: 'none', marginLeft: 'auto', padding: 0 }}
                >
                  Cerrar
                </button>
              </div>
            )}

            <div className={styles.filtersRow}>
              <input
                placeholder="Buscar por titulo"
                value={bookQuery}
                onChange={(e) => {
                  setBookQuery(e.target.value)
                  setBooksPagination(prev => ({ ...prev, page: 1 }))
                }}
              />
              <label>
                <input
                  type="checkbox"
                  checked={includeInactiveBooks}
                  onChange={(e) => {
                    setIncludeInactiveBooks(e.target.checked)
                    setBooksPagination(prev => ({ ...prev, page: 1 }))
                  }}
                />
                Mostrar inactivos
              </label>
            </div>

            {paginator(booksPagination, setBooksPagination)}
            <div className={styles.tableWrapper}>
              {booksLoading && books.length === 0 ? (
                <div className={styles.loadingFirst}>Cargando...</div>
              ) : (
                <div className={`${styles.table} ${booksLoading ? styles.tableLoading : ''}`}>
                  {booksLoading && <span className={styles.tableSpinner}>⟳ cargando</span>}
                  <table>
                    <thead>
                      <tr>
                        <th onClick={() => toggleSort(bookSortBy, bookSortDir, setBookSortBy, setBookSortDir, 'notice_id')} className={styles.sortableHeader}>ID{sortArrow(bookSortBy === 'notice_id', bookSortDir)}</th>
                        <th onClick={() => toggleSort(bookSortBy, bookSortDir, setBookSortBy, setBookSortDir, 'tit1')} className={styles.sortableHeader}>Titulo{sortArrow(bookSortBy === 'tit1', bookSortDir)}</th>
                    <th onClick={() => toggleSort(bookSortBy, bookSortDir, setBookSortBy, setBookSortDir, 'year')} className={styles.sortableHeader}>Ano{sortArrow(bookSortBy === 'year', bookSortDir)}</th>
                    <th onClick={() => toggleSort(bookSortBy, bookSortDir, setBookSortBy, setBookSortDir, 'code')} className={styles.sortableHeader}>Codigo{sortArrow(bookSortBy === 'code', bookSortDir)}</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map(book => (
                    <tr key={book.notice_id}>
                      <td>{book.notice_id}</td>
                      <td>{book.tit1}</td>
                      <td>{book.year || 'N/A'}</td>
                      <td>{book.code || 'N/A'}</td>
                      <td>{book.is_active ? 'Activo' : 'Inactivo'}</td>
                      <td>
                        <div className={styles.actionsRow}>
                          <button onClick={() => editBook(book)}>Editar</button>
                          <button type="button" onClick={() => handleViewCopies(book)}>Ejemplares</button>
                          <button
                            className={book.is_active ? styles.dangerButton : ''}
                            onClick={async () => {
                              const ok = await patchBook(book.notice_id, {
                                is_active: !book.is_active
                              })
                              if (ok) setRefreshKey(k => k + 1)
                            }}
                          >
                            {book.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              )}
            </div>
            {paginator(booksPagination, setBooksPagination)}
          </section>
        )}

        {activeTab === 'users' && (
          <section>
            <h2>Usuarios</h2>

            <form className={styles.inlineForm} onSubmit={createUser}>
              <input placeholder="Apellido" value={newUser.empr_nom} onChange={(e) => setNewUser(prev => ({ ...prev, empr_nom: e.target.value }))} required />
              <input placeholder="Nombre" value={newUser.empr_prenom} onChange={(e) => setNewUser(prev => ({ ...prev, empr_prenom: e.target.value }))} required />
              <input placeholder="Carne" value={newUser.empr_cb} onChange={(e) => setNewUser(prev => ({ ...prev, empr_cb: e.target.value }))} />
              <input placeholder="Email" value={newUser.empr_mail} onChange={(e) => setNewUser(prev => ({ ...prev, empr_mail: e.target.value }))} />
              <input placeholder="Telefono" value={newUser.empr_tel1} onChange={(e) => setNewUser(prev => ({ ...prev, empr_tel1: e.target.value }))} />
              <button type="submit">+ Usuario</button>
            </form>

            <div className={styles.filtersRow}>
              <input
                placeholder="Buscar por nombre, apellido o carne"
                value={userQuery}
                onChange={(e) => {
                  setUserQuery(e.target.value)
                  setUsersPagination(prev => ({ ...prev, page: 1 }))
                }}
              />
              <select
                value={userGroupFilter}
                onChange={(e) => {
                  setUserGroupFilter(e.target.value)
                  setUsersPagination(prev => ({ ...prev, page: 1 }))
                }}
              >
                <option value="">Todos los grupos</option>
                {groups.map(g => (
                  <option key={g.id_groupe} value={g.id_groupe}>{g.libelle_groupe}</option>
                ))}
              </select>
              <label>
                <input
                  type="checkbox"
                  checked={includeInactiveUsers}
                  onChange={(e) => {
                    setIncludeInactiveUsers(e.target.checked)
                    setUsersPagination(prev => ({ ...prev, page: 1 }))
                  }}
                />
                Mostrar inactivos
              </label>
            </div>

            {paginator(usersPagination, setUsersPagination)}
            <div className={styles.tableWrapper}>
              {usersLoading && users.length === 0 ? (
                <div className={styles.loadingFirst}>Cargando...</div>
              ) : (
                <div className={`${styles.table} ${usersLoading ? styles.tableLoading : ''}`}>
                  {usersLoading && <span className={styles.tableSpinner}>⟳ cargando</span>}
                  <table>
                    <thead>
                      <tr>
                        <th className={styles.sortableHeader} onClick={() => toggleSort(userSortBy, userSortDir, setUserSortBy, setUserSortDir, 'id_empr')}>ID{sortArrow(userSortBy === 'id_empr', userSortDir)}</th>
                        <th className={styles.sortableHeader} onClick={() => toggleSort(userSortBy, userSortDir, setUserSortBy, setUserSortDir, 'empr_cb')}>Carne{sortArrow(userSortBy === 'empr_cb', userSortDir)}</th>
                        <th className={styles.sortableHeader} onClick={() => toggleSort(userSortBy, userSortDir, setUserSortBy, setUserSortDir, 'empr_nom')}>Apellido{sortArrow(userSortBy === 'empr_nom', userSortDir)}</th>
                    <th className={styles.sortableHeader} onClick={() => toggleSort(userSortBy, userSortDir, setUserSortBy, setUserSortDir, 'empr_prenom')}>Nombre{sortArrow(userSortBy === 'empr_prenom', userSortDir)}</th>
                    <th>Grupo</th>
                    <th className={styles.sortableHeader} onClick={() => toggleSort(userSortBy, userSortDir, setUserSortBy, setUserSortDir, 'empr_mail')}>Email{sortArrow(userSortBy === 'empr_mail', userSortDir)}</th>
                    <th className={styles.sortableHeader} onClick={() => toggleSort(userSortBy, userSortDir, setUserSortBy, setUserSortDir, 'empr_tel1')}>Telefono{sortArrow(userSortBy === 'empr_tel1', userSortDir)}</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(user => (
                    <tr key={user.id_empr}>
                      <td>{user.id_empr}</td>
                      <td>{user.empr_cb || 'N/A'}</td>
                      <td>{user.empr_nom}</td>
                      <td>{user.empr_prenom || 'N/A'}</td>
                      <td>{user.user_groups || 'Sin grupo'}</td>
                      <td>{user.empr_mail || 'N/A'}</td>
                      <td>{user.empr_tel1 || 'N/A'}</td>
                      <td>{user.is_active ? 'Activo' : 'Inactivo'}</td>
                      <td>
                        <div className={styles.actionsRow}>
                          <button onClick={() => editUser(user)}>Editar</button>
                          <button
                            className={user.is_active ? styles.dangerButton : ''}
                            onClick={async () => {
                              const ok = await patchUser(user.id_empr, {
                                is_active: !user.is_active
                              })
                              if (ok) setRefreshKey(k => k + 1)
                            }}
                          >
                            {user.is_active ? 'Desactivar' : 'Activar'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
                </div>
              )}
            </div>
            {paginator(usersPagination, setUsersPagination)}
          </section>
        )}

        {activeTab === 'groups' && (
          <section>
            <h2>Gestión de Grupos</h2>
            <div className={styles.configGrid}>
              <div className={styles.configCard}>
                <h3>Listado de Grupos</h3>
                <form className={styles.inlineForm} onSubmit={handleCreateGroup}>
                  <input
                    placeholder="Nuevo grupo (ej: 2º ESO)"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    required
                  />
                  <button type="submit">+ Crear Grupo</button>
                </form>

                <div className={styles.tableWrapper}>
                  <div className={styles.table}>
                    <table>
                      <thead>
                        <tr>
                          <th>Grupo</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {groups.length === 0 && (
                          <tr><td colSpan={2}>No hay grupos creados</td></tr>
                        )}
                        {groups.map(g => (
                          <tr
                            key={g.id_groupe}
                            className={selectedGroup === g.id_groupe ? styles.selectedResult : ''}
                            style={{ cursor: 'pointer' }}
                            onClick={() => setSelectedGroup(g.id_groupe)}
                          >
                            <td style={{ fontWeight: selectedGroup === g.id_groupe ? 'bold' : 'normal' }}>
                              {g.libelle_groupe}
                            </td>
                            <td>
                              <div className={styles.actionsRow} onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => handleRenameGroup(g.id_groupe, g.libelle_groupe)}>Renombrar</button>
                                <button className={styles.dangerButton} onClick={() => handleDeleteGroup(g.id_groupe, g.libelle_groupe)}>Eliminar</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className={styles.configCard}>
                {selectedGroup === null ? (
                  <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                    Selecciona un grupo de la lista para gestionar sus alumnos
                  </div>
                ) : (
                  <>
                    <h3>
                      Alumnos de: <strong>{groups.find(g => g.id_groupe === selectedGroup)?.libelle_groupe || ''}</strong>
                    </h3>

                    <div style={{ marginBottom: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                      <label style={{ display: 'block', fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.5rem' }}>
                        Agregar alumno al grupo
                      </label>
                      <div className={styles.searchInline}>
                        <input
                          placeholder="Buscar alumno por nombre/apellido..."
                          value={groupUsersSearchQuery}
                          onChange={(e) => setGroupUsersSearchQuery(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchGroupUsers())}
                        />
                        <button type="button" onClick={handleSearchGroupUsers}>Buscar</button>
                      </div>
                      {groupUsersSearchResults.length > 0 && (
                        <ul className={styles.searchResultList} style={{ marginTop: '0.5rem' }}>
                          {groupUsersSearchResults.map(u => (
                            <li
                              key={u.id_empr}
                              onClick={() => handleAddUserToGroup(u.id_empr)}
                            >
                              {u.empr_nom} {u.empr_prenom} {u.user_groups ? `(${u.user_groups})` : ''} &mdash; carnet: {u.empr_cb || 'N/A'} (ID: {u.id_empr})
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className={styles.tableWrapper}>
                      {selectedGroupLoading ? (
                        <div className={styles.loadingFirst}>Cargando alumnos...</div>
                      ) : (
                        <div className={styles.table}>
                          <table>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Nombre</th>
                                <th>Acción</th>
                              </tr>
                            </thead>
                            <tbody>
                              {selectedGroupUsers.length === 0 && (
                                <tr><td colSpan={3}>No hay alumnos asociados a este grupo</td></tr>
                              )}
                              {selectedGroupUsers.map(u => (
                                <tr key={u.id_empr}>
                                  <td>{u.id_empr}</td>
                                  <td>{u.empr_nom}{u.empr_prenom ? `, ${u.empr_prenom}` : ''}</td>
                                  <td>
                                    <button
                                      className={styles.dangerButton}
                                      onClick={() => handleRemoveUserFromGroup(u.id_empr)}
                                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                    >
                                      Quitar
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        )}

        {activeTab === 'loans' && (
          <section>
            <h2>Prestamos</h2>

            {/* Nuevo préstamo */}
            <details className={styles.newLoanPanel} onToggle={handleDetailsToggle}>
              <summary>+ Nuevo prestamo</summary>
              <form onSubmit={createLoan} className={styles.newLoanForm}>
                <div className={styles.loanFormFields}>
                  <div className={styles.loanSearchBlock}>
                    <label>Usuario</label>
                    <div className={styles.searchInline}>
                      <input
                        placeholder="Buscar por nombre..."
                        value={loanUserQuery}
                        onChange={(e) => setLoanUserQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLoanUsers())}
                      />
                      <select
                        value={loanUserGroupFilter}
                        onChange={(e) => setLoanUserGroupFilter(e.target.value)}
                        style={{ maxWidth: '140px' }}
                      >
                        <option value="">Cualquier grupo</option>
                        {groups.map(g => (
                          <option key={g.id_groupe} value={g.id_groupe}>{g.libelle_groupe}</option>
                        ))}
                      </select>
                      <button type="button" onClick={searchLoanUsers}>Buscar</button>
                    </div>
                    {loanUserResults.length > 0 && (
                      <ul className={styles.searchResultList}>
                        {loanUserResults.map(u => (
                          <li
                            key={u.id_empr}
                            className={newLoan.id_empr === String(u.id_empr) ? styles.selectedResult : ''}
                            onClick={() => {
                              setNewLoan(prev => ({ ...prev, id_empr: String(u.id_empr) }))
                              setLoanUserResults([])
                              setLoanUserQuery(`${u.empr_nom}, ${u.empr_prenom || ''} (ID: ${u.id_empr})`)
                            }}
                          >
                            {u.empr_nom} {u.empr_prenom} {u.user_groups ? `(${u.user_groups})` : ''} &mdash; carnet: {u.empr_cb || 'N/A'} (ID: {u.id_empr})
                          </li>
                        ))}
                      </ul>
                    )}
                    <input
                      placeholder="ID usuario"
                      value={newLoan.id_empr}
                      onChange={(e) => setNewLoan(prev => ({ ...prev, id_empr: e.target.value }))}
                      required
                      style={{ marginTop: '0.4rem', width: '120px' }}
                    />
                  </div>

                  <div className={styles.loanSearchBlock}>
                    <label>Ejemplar (codigo de barras o titulo)</label>
                    <div className={styles.searchInline}>
                      <input
                        placeholder="Buscar ejemplar disponible..."
                        value={loanCopyQuery}
                        onChange={(e) => setLoanCopyQuery(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), searchLoanCopies())}
                      />
                      <button type="button" onClick={searchLoanCopies}>Buscar</button>
                    </div>
                    {loanCopyResults.length > 0 && (
                      <ul className={styles.searchResultList}>
                        {loanCopyResults.map(c => (
                          <li
                            key={c.expl_id}
                            className={newLoan.expl_cb === c.expl_cb ? styles.selectedResult : ''}
                            onClick={() => {
                              setNewLoan(prev => ({ ...prev, expl_cb: c.expl_cb }))
                              setLoanCopyResults([])
                              setLoanCopyQuery(`${c.tit1} (${c.expl_cb})`)
                            }}
                          >
                            {c.tit1} &mdash; codigo: {c.expl_cb}
                          </li>
                        ))}
                      </ul>
                    )}
                    <input
                      ref={explCbRef}
                      placeholder="Codigo barras"
                      value={newLoan.expl_cb}
                      onChange={(e) => setNewLoan(prev => ({ ...prev, expl_cb: e.target.value }))}
                      required
                      style={{ marginTop: '0.4rem', width: '160px' }}
                    />
                  </div>
                </div>

                <div className={styles.loanFormActions}>
                  <button type="submit" className={styles.primaryButton}>Registrar Prestamo</button>
                </div>
              </form>
              {loanFeedback && (
                <p className={loanFeedback.startsWith('Error') ? styles.errorText : styles.successText}>
                  {loanFeedback}
                </p>
              )}
            </details>

            <div className={styles.filtersRow}>
              <input placeholder="Buscar usuario" value={loanFilters.borrower} onChange={(e) => setLoanFilters(prev => ({ ...prev, borrower: e.target.value }))} />
              <input placeholder="Buscar libro" value={loanFilters.book} onChange={(e) => setLoanFilters(prev => ({ ...prev, book: e.target.value }))} />
              <select
                value={loanFilters.groupId}
                onChange={(e) => setLoanFilters(prev => ({ ...prev, groupId: e.target.value }))}
              >
                <option value="">Todos los grupos</option>
                {groups.map(g => (
                  <option key={g.id_groupe} value={g.id_groupe}>{g.libelle_groupe}</option>
                ))}
              </select>
              <input type="date" value={loanFilters.dateFrom} onChange={(e) => setLoanFilters(prev => ({ ...prev, dateFrom: e.target.value }))} />
              <input type="date" value={loanFilters.dateTo} onChange={(e) => setLoanFilters(prev => ({ ...prev, dateTo: e.target.value }))} />
              <label>
                <input type="checkbox" checked={loanFilters.activeOnly} onChange={(e) => setLoanFilters(prev => ({ ...prev, activeOnly: e.target.checked }))} />
                Solo vigentes
              </label>
              <button onClick={() => setLoansPagination(prev => ({ ...prev, page: 1 }))}>Filtrar</button>
            </div>

            {paginator(loansPagination, setLoansPagination)}
            <div className={styles.tableWrapper}>
              {loansLoading && loans.length === 0 ? (
                <div className={styles.loadingFirst}>Cargando...</div>
              ) : (
                <div className={`${styles.table} ${loansLoading ? styles.tableLoading : ''}`}>
                  {loansLoading && <span className={styles.tableSpinner}>⟳ cargando</span>}
                  <table>
                    <thead>
                      <tr>
                        <th className={styles.sortableHeader} onClick={() => toggleSort(loanSortBy, loanSortDir, setLoanSortBy, setLoanSortDir, 'pret_id')}>Ejpl{sortArrow(loanSortBy === 'pret_id', loanSortDir)}</th>
                        <th className={styles.sortableHeader} onClick={() => toggleSort(loanSortBy, loanSortDir, setLoanSortBy, setLoanSortDir, 'tit1')}>Libro{sortArrow(loanSortBy === 'tit1', loanSortDir)}</th>
                    <th className={styles.sortableHeader} onClick={() => toggleSort(loanSortBy, loanSortDir, setLoanSortBy, setLoanSortDir, 'empr_nom')}>Usuario{sortArrow(loanSortBy === 'empr_nom', loanSortDir)}</th>
                    <th>Grupo</th>
                    <th className={styles.sortableHeader} onClick={() => toggleSort(loanSortBy, loanSortDir, setLoanSortBy, setLoanSortDir, 'pret_date')}>Fecha{sortArrow(loanSortBy === 'pret_date', loanSortDir)}</th>
                    <th className={styles.sortableHeader} onClick={() => toggleSort(loanSortBy, loanSortDir, setLoanSortBy, setLoanSortDir, 'pret_retour')}>Vence{sortArrow(loanSortBy === 'pret_retour', loanSortDir)}</th>
                    <th>Renov.</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {loans.map(loan => {
                    const vencido = loan.pret_retour && new Date(loan.pret_retour) < new Date()
                    return (
                      <tr key={`${loan.pret_idexpl}-${loan.pret_idempr}`} className={vencido ? styles.overdueRow : ''}>
                        <td>{loan.pret_idexpl}</td>
                        <td title={loan.expl_cb}>{loan.tit1}</td>
                        <td>{loan.empr_nom}{loan.empr_prenom ? `, ${loan.empr_prenom}` : ''}</td>
                        <td>{loan.borrower_groups || 'Sin grupo'}</td>
                        <td>{new Date(loan.pret_date).toLocaleDateString('es-ES')}</td>
                        <td>{loan.pret_retour ? new Date(loan.pret_retour).toLocaleDateString('es-ES') : 'N/A'}</td>
                        <td>{loan.cpt_prolongation}/{maxRenewals}</td>
                        <td>
                          <div className={styles.actionsRow}>
                            <button onClick={() => doReturnLoan(loan.pret_idexpl)}>Devolver</button>
                            <button
                              disabled={loan.cpt_prolongation >= maxRenewals}
                              onClick={() => doRenewLoan(loan.pret_idexpl)}
                            >
                              Renovar
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                  </table>
                </div>
              )}
            </div>
            {paginator(loansPagination, setLoansPagination)}
          </section>
        )}

        {activeTab === 'config' && (
          <section>
            <h2>Configuracion</h2>
            <div className={styles.configGrid}>
              <div className={styles.configCard}>
                <h3>Parametros</h3>
                {settings.map(s => (
                  <div key={s.key_name} className={styles.formRow}>
                    <label>{s.description || s.key_name}</label>
                    <input
                      value={s.key_value}
                      onChange={(e) =>
                        setSettings(prev =>
                          prev.map(item =>
                            item.key_name === s.key_name
                              ? { ...item, key_value: e.target.value }
                              : item
                          )
                        )
                      }
                    />
                  </div>
                ))}
                <button onClick={saveSettings}>Guardar</button>
                {settingsMessage && <p>{settingsMessage}</p>}
              </div>

              <div className={styles.configCard}>
                <h3>Usuarios de acceso</h3>
                <form className={styles.inlineForm} onSubmit={createConfigUser}>
                  <input placeholder="Usuario" value={newConfigUser.username} onChange={(e) => setNewConfigUser(prev => ({ ...prev, username: e.target.value }))} required />
                  <input type="password" placeholder="Clave" value={newConfigUser.password} onChange={(e) => setNewConfigUser(prev => ({ ...prev, password: e.target.value }))} required />
                  <select value={newConfigUser.role} onChange={(e) => setNewConfigUser(prev => ({ ...prev, role: e.target.value === 'admin' ? 'admin' : 'staff' }))}>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </select>
                  <button type="submit">Crear</button>
                </form>

                <div className={styles.tableWrapper}>
                  {configLoading && configUsers.length === 0 ? (
                    <div className={styles.loadingFirst}>Cargando...</div>
                  ) : (
                    <div className={`${styles.table} ${configLoading ? styles.tableLoading : ''}`}>
                      {configLoading && <span className={styles.tableSpinner}>⟳ cargando</span>}
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Usuario</th>
                            <th>Rol</th>
                          </tr>
                        </thead>
                        <tbody>
                          {configUsers.map(cu => (
                            <tr key={cu.id}>
                              <td>{cu.id}</td>
                              <td>{cu.username}</td>
                              <td>{cu.role}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
                {paginator(configUsersPagination, setConfigUsersPagination)}
              </div>
            </div>

            <div className={styles.configCard} style={{ marginTop: '1.5rem' }}>
              <h3>Mantenimiento de BD</h3>
              <p className={styles.configHint}>
                Solo admin. Realiza copia de seguridad, reinicia la BD o importa un archivo PMB (.sav o mysqldump).
              </p>

              <BackupSection />
            </div>
          </section>
        )}

        {activeTab === 'stats' && (
          <section>
            <h2>Estadisticas</h2>
            {statsError && <p className={styles.errorText}>{statsError}</p>}
            {statsLoading && !stats && (
              <div className={styles.loadingFirst}>Cargando estadisticas...</div>
            )}
            {stats && (
              <>
                {statsLoading && <div className={styles.tableLoading} style={{ opacity: 0.6 }} />}
                <div className={styles.statsGrid}>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Libros</span>
                    <span className={styles.statValue}>{stats.totalBooks}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Ejemplares</span>
                    <span className={styles.statValue}>{stats.totalCopies}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Usuarios</span>
                    <span className={styles.statValue}>{stats.totalUsers}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Prestamos activos</span>
                    <span className={styles.statValue}>{stats.activeLoans}</span>
                  </div>
                  <div className={styles.statCard}>
                    <span className={styles.statLabel}>Vencidos</span>
                    <span className={styles.statValue}>{stats.overdueLoans}</span>
                  </div>
                </div>

                <h3>Top 5 libros mas prestados (12 meses)</h3>
                <div className={`${styles.table} ${statsLoading ? styles.tableLoading : ''}`}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Titulo</th>
                        <th>Prestamos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBooks.length === 0 && (
                        <tr><td colSpan={3}>Sin datos</td></tr>
                      )}
                      {topBooks.map(b => (
                        <tr key={b.notice_id}>
                          <td>{b.notice_id}</td>
                          <td>{b.tit1}</td>
                          <td>{b.loan_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <h3>Top 5 usuarios con mas prestamos activos</h3>
                <div className={`${styles.table} ${statsLoading ? styles.tableLoading : ''}`}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Apellido, Nombre</th>
                        <th>Prestamos activos</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topBorrowers.length === 0 && (
                        <tr><td colSpan={3}>Sin datos</td></tr>
                      )}
                      {topBorrowers.map(u => (
                        <tr key={u.id_empr}>
                          <td>{u.id_empr}</td>
                          <td>{u.empr_nom}{u.empr_prenom ? `, ${u.empr_prenom}` : ''}</td>
                          <td>{u.active_loan_count}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}
      </main>

      {editingBook && (
        <div className={styles.modalOverlay} onClick={() => setEditingBook(null)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Editar Libro (ID: {editingBook.notice_id})</h3>
              <button className={styles.modalCloseButton} onClick={() => setEditingBook(null)}>×</button>
            </div>
            <form onSubmit={handleSaveBook}>
              <div className={styles.modalBody}>
                <div className={styles.modalForm}>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_book_tit1">Título</label>
                    <input
                      id="edit_book_tit1"
                      value={editingBookForm.tit1}
                      onChange={(e) => setEditingBookForm(prev => ({ ...prev, tit1: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_book_year">Año</label>
                    <input
                      id="edit_book_year"
                      value={editingBookForm.year}
                      onChange={(e) => setEditingBookForm(prev => ({ ...prev, year: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_book_code">Código</label>
                    <input
                      id="edit_book_code"
                      value={editingBookForm.code}
                      onChange={(e) => setEditingBookForm(prev => ({ ...prev, code: e.target.value }))}
                      required
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setEditingBook(null)}>Cancelar</button>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editingUser && (
        <div className={styles.modalOverlay} onClick={() => setEditingUser(null)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Editar Usuario (ID: {editingUser.id_empr})</h3>
              <button className={styles.modalCloseButton} onClick={() => setEditingUser(null)}>×</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className={styles.modalBody}>
                <div className={styles.modalForm}>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_nom">Apellido</label>
                    <input
                      id="edit_user_nom"
                      value={editingUserForm.empr_nom}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_nom: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_prenom">Nombre</label>
                    <input
                      id="edit_user_prenom"
                      value={editingUserForm.empr_prenom}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_prenom: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_cb">Carné</label>
                    <input
                      id="edit_user_cb"
                      value={editingUserForm.empr_cb}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_cb: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_mail">Email</label>
                    <input
                      id="edit_user_mail"
                      type="email"
                      value={editingUserForm.empr_mail}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_mail: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_tel">Teléfono</label>
                    <input
                      id="edit_user_tel"
                      value={editingUserForm.empr_tel1}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_tel1: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button type="button" className={styles.cancelButton} onClick={() => setEditingUser(null)}>Cancelar</button>
                <button type="submit">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCopiesModal && copiesModalBook && (
        <div className={styles.modalOverlay} onClick={() => setShowCopiesModal(false)}>
          <div className={styles.modalContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3>Ejemplares de: {copiesModalBook.tit1}</h3>
              <button className={styles.modalCloseButton} onClick={() => setShowCopiesModal(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {copiesLoading ? (
                <div style={{ textAlign: 'center', padding: '1.5rem' }}>Cargando ejemplares...</div>
              ) : copiesList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-secondary)' }}>
                  No hay ejemplares registrados para este libro.
                </div>
              ) : (
                <div className={styles.tableWrapper}>
                  <div className={styles.table} style={{ border: 'none', boxShadow: 'none' }}>
                    <table>
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Código Barras</th>
                          <th>Estado</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {copiesList.map((copy) => (
                          <tr key={copy.expl_id}>
                            <td>{copy.expl_id}</td>
                            <td>
                              <strong>{copy.expl_cb || 'N/A'}</strong>
                            </td>
                            <td>{copy.expl_statut === '1' ? 'Disponible' : `Código: ${copy.expl_statut}`}</td>
                            <td>
                              {copy.expl_cb && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPrintBarcodeValue(copy.expl_cb)
                                    setPrintBarcodeTitle(copiesModalBook.tit1)
                                    setTimeout(() => window.print(), 50)
                                  }}
                                  style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }}
                                >
                                  Imprimir Código
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
            <div className={styles.modalFooter}>
              <button type="button" className={styles.cancelButton} onClick={() => setShowCopiesModal(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <div className="print-section">
        <div className="barcode-label">
          <div className="label-title">{printBarcodeTitle}</div>
          <div className="label-barcode">*{printBarcodeValue}*</div>
          <div className="label-text">{printBarcodeValue}</div>
        </div>
      </div>
    </div>
  )
}

function BackupSection() {
  interface DbLog {
    timestamp: string
    type: 'info' | 'success' | 'warning' | 'error'
    text: string
  }

  const [backups, setBackups] = useState<Array<{ name: string; sizeBytes: number; createdAt: string }>>([])
  const [working, setWorking] = useState(false)
  const [confirmReset, setConfirmReset] = useState('')
  const [confirmImport, setConfirmImport] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [importToken, setImportToken] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [dbLogs, setDbLogs] = useState<DbLog[]>([])
  const consoleEndRef = useRef<HTMLDivElement>(null)

  const addLog = (text: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    const timestamp = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    setDbLogs(prev => [...prev, { timestamp, type, text }])
  }

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [dbLogs])

  const loadBackups = useCallback(async () => {
    try {
      const res = await fetch('/api/config/backup')
      const data = await res.json()
      if (data.success) setBackups(data.data)
    } catch {
      addLog('Error al listar copias de seguridad de la base de datos', 'error')
    }
  }, [])

  useEffect(() => {
    loadBackups()
  }, [loadBackups])

  const doCreate = async () => {
    setWorking(true)
    addLog('Iniciando creación de copia de seguridad de la base de datos...', 'info')
    try {
      const res = await fetch('/api/config/backup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: 'manual' })
      })
      const data = await res.json()
      if (data.success) {
        addLog(`Copia de seguridad creada correctamente: ${data.data.name}`, 'success')
        loadBackups()
      } else {
        addLog(`Error al crear copia de seguridad: ${data.error}`, 'error')
      }
    } catch (e) {
      addLog(`Error al crear copia de seguridad: ${(e as Error).message}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const doDelete = async (name: string) => {
    if (!confirm('Borrar backup ' + name + '?')) return
    setWorking(true)
    addLog(`Eliminando copia de seguridad: ${name}...`, 'info')
    try {
      const res = await fetch('/api/config/backup?name=' + encodeURIComponent(name), { method: 'DELETE' })
      const data = await res.json()
      if (data.success) {
        addLog(`Copia de seguridad eliminada con éxito: ${name}`, 'success')
        loadBackups()
      } else {
        addLog(`Error al eliminar copia de seguridad: ${data.error}`, 'error')
      }
    } catch (e) {
      addLog(`Error al eliminar copia de seguridad: ${(e as Error).message}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const getResetToken = async (): Promise<string | null> => {
    const res = await fetch('/api/config/backup/confirm?action=reset')
    const data = await res.json()
    if (data.success) {
      setResetToken(data.data.token)
      return data.data.token as string
    }
    addLog('Error al generar token de confirmación para reiniciar: ' + data.error, 'error')
    return null
  }

  const doReset = async () => {
    if (confirmReset.trim().toUpperCase() !== 'BORRAR') {
      addLog('Confirmación de reinicio fallida: Debes escribir "BORRAR" en el campo de confirmación', 'warning')
      return
    }
    if (!confirmPassword) {
      addLog('Confirmación de reinicio fallida: Introduce tu contraseña de administrador', 'warning')
      return
    }
    addLog('Solicitando token para reiniciar base de datos...', 'info')
    const token = resetToken || await getResetToken()
    if (!token) return
    if (!confirm('Esta operación borrará TODOS los datos PMB. ¿Continuar?')) {
      addLog('Reinicio de base de datos cancelado por el usuario', 'info')
      return
    }
    setWorking(true)
    addLog('Reiniciando base de datos...', 'info')
    try {
      const res = await fetch('/api/config/backup/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, confirm: confirmReset, password: confirmPassword })
      })
      const data = await res.json()
      if (data.success) {
        addLog(`Base de datos reiniciada con éxito. Tablas eliminadas: ${data.data.tablesDropped.join(', ')}`, 'success')
        setResetToken('')
        setConfirmReset('')
        setConfirmPassword('')
        loadBackups()
      } else {
        addLog(`Error al reiniciar base de datos: ${data.error}`, 'error')
      }
    } catch (e) {
      addLog(`Error al reiniciar base de datos: ${(e as Error).message}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const getImportToken = async (): Promise<string | null> => {
    const res = await fetch('/api/config/backup/confirm?action=import')
    const data = await res.json()
    if (data.success) {
      setImportToken(data.data.token)
      return data.data.token as string
    }
    addLog('Error al generar token de confirmación para importar: ' + data.error, 'error')
    return null
  }

  const doImport = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const fileInput = form.elements.namedItem('file') as HTMLInputElement
    const file = fileInput.files?.[0]
    if (!file) {
      addLog('Error de importación: Selecciona un archivo (.sav o .sql)', 'warning')
      return
    }
    if (confirmImport.trim().toUpperCase() !== 'IMPORTAR') {
      addLog('Confirmación de importación fallida: Debes escribir "IMPORTAR" en el campo de confirmación', 'warning')
      return
    }
    if (!confirmPassword) {
      addLog('Confirmación de importación fallida: Introduce tu contraseña de administrador', 'warning')
      return
    }
    addLog('Solicitando token para importar archivo...', 'info')
    const token = importToken || await getImportToken()
    if (!token) return
    if (!confirm('Importar reemplazará los datos PMB actuales. ¿Continuar?')) {
      addLog('Importación cancelada por el usuario', 'info')
      return
    }
    setWorking(true)
    addLog(`Importando archivo "${file.name}"... (esta operación puede tardar unos momentos)`, 'info')
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('token', token)
      fd.append('confirm', confirmImport)
      fd.append('password', confirmPassword)
      const res = await fetch('/api/config/backup/import', { method: 'POST', body: fd })
      const data = await res.json()
      if (data.success) {
        addLog(`Importación completada con éxito. Formato detectado: ${data.data.format}.`, 'success')
        addLog(`Tablas importadas: ${data.data.tablesImported.join(', ')}`, 'success')
        if (data.data.tablesSkipped && data.data.tablesSkipped.length > 0) {
          addLog(`Tablas saltadas (no leídas por la app): ${data.data.tablesSkipped.join(', ')}`, 'info')
        }
        if (data.data.warnings && data.data.warnings.length > 0) {
          data.data.warnings.forEach((w: string) => addLog(`[Advertencia de Base de Datos] ${w}`, 'warning'))
        }
        setImportToken('')
        setConfirmImport('')
        setConfirmPassword('')
        loadBackups()
      } else {
        addLog(`Error al importar archivo: ${data.error}`, 'error')
      }
    } catch (err) {
      addLog(`Error al importar archivo: ${(err as Error).message}`, 'error')
    } finally {
      setWorking(false)
    }
  }

  const formatSize = (b: number) => {
    if (b < 1024) return b + ' B'
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB'
    return (b / 1024 / 1024).toFixed(1) + ' MB'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', width: '100%' }}>
      <div className={styles.backupContainer}>
        {/* Columna Izquierda: Listado de Backups */}
        <div className={styles.backupListColumn}>
          <div className={styles.backupActions}>
            <button onClick={doCreate} disabled={working}>Crear backup ahora</button>
          </div>

          {backups.length > 0 ? (
            <div className={styles.backupTableWrapper}>
              <table className={styles.backupTable}>
                <thead>
                  <tr>
                    <th>Archivo</th>
                    <th>Fecha</th>
                    <th>Tamaño</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {backups.map(b => (
                    <tr key={b.name}>
                      <td>{b.name}</td>
                      <td>{new Date(b.createdAt).toLocaleString('es-ES')}</td>
                      <td>{formatSize(b.sizeBytes)}</td>
                      <td>
                        <div className={styles.backupRowActions}>
                          <a href={'/api/config/backup/download/' + encodeURIComponent(b.name)} download>Descargar</a>
                          <button onClick={() => doDelete(b.name)} className={styles.dangerButton}>Borrar</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className={styles.noData}>No hay copias de seguridad creadas</div>
          )}
        </div>

        {/* Columna Derecha: Operaciones Peligrosas */}
        <div className={styles.backupOperationsColumn}>
          <div className={styles.dangerZone}>
            <h4>Reiniciar BD</h4>
            <p className={styles.dangerText}>
              Borra TODAS las tablas PMB (notices, exemplaires, empr, pret, etc) y deja solo las tablas app_*.
              Se crea un backup de seguridad automático antes. Esta acción es IRREVERSIBLE sin un backup válido.
            </p>
            <input
              type="text"
              placeholder='Escribe "BORRAR" para confirmar'
              value={confirmReset}
              onChange={(e) => setConfirmReset(e.target.value)}
            />
            <input
              type="password"
              placeholder='Tu password de admin'
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            <button onClick={doReset} disabled={working} className={styles.dangerButton}>
              Reiniciar BD
            </button>
          </div>

          <div className={styles.dangerZone}>
            <h4>Importar archivo PMB</h4>
            <p className={styles.dangerText}>
              Acepta archivos .sav (formato PMB nativo) o mysqldump (.sql). Solo se importan las 8 tablas
              que la app usa: notices, exemplaires, empr, pret, authors, responsability, groupe, empr_groupe.
            </p>
            <form onSubmit={doImport}>
              <input type="file" name="file" accept=".sav,.sql,.sql.gz" />
              <input
                type="text"
                placeholder='Escribe "IMPORTAR" para confirmar'
                value={confirmImport}
                onChange={(e) => setConfirmImport(e.target.value)}
              />
              <input
                type="password"
                placeholder='Tu password de admin'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button type="submit" disabled={working} className={styles.dangerButton}>
                Importar
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Monitor de Operaciones en tiempo real */}
      <div className={styles.consoleWrapper}>
        <div className={styles.consoleHeader}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={styles.consoleDot}></span>
            <strong>Monitor de Operaciones de Base de Datos (Tiempo Real)</strong>
          </div>
          {dbLogs.length > 0 && (
            <button onClick={() => setDbLogs([])} className={styles.consoleClearBtn}>
              Limpiar consola
            </button>
          )}
        </div>
        <div className={styles.consoleBody}>
          {dbLogs.length === 0 ? (
            <div className={styles.consolePlaceholder}>
              Esperando operaciones de base de datos... Crea una copia de seguridad, reinicia la base de datos o importa un archivo PMB para comenzar el monitoreo.
            </div>
          ) : (
            dbLogs.map((log, idx) => (
              <div key={idx} className={`${styles.logLine} ${styles[log.type]}`}>
                <span className={styles.logTimestamp}>[{log.timestamp}]</span>{' '}
                <span className={styles.logText}>{log.text}</span>
              </div>
            ))
          )}
          <div ref={consoleEndRef} />
        </div>
      </div>
    </div>
  )
}
