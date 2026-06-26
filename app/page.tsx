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
  empr_sexe?: number
  empr_year?: number
  empr_ville?: string
  empr_date_adhesion?: string | null
  empr_date_expiration?: string | null
  empr_categ?: number
  groupId?: number
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

interface Author {
  author_id: number
  author_name: string
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

type Tab = 'books' | 'users' | 'groups' | 'loans' | 'config' | 'stats' | 'reports'

const initialPagination: PaginationMeta = {
  page: 1,
  pageSize: 20,
  total: 0,
  totalPages: 1
}

export default function Home() {
  const explCbRef = useRef<HTMLInputElement>(null)
  const quickReturnInputRef = useRef<HTMLInputElement>(null)
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

  const [newBook, setNewBook] = useState({
    tit1: '',
    year: '',
    code: '', // ISBN
    author_name: '',
    author_id: '',
    ed_name: '',
    ed_id: '',
    npages: '',
    code_langue: 'spa'
  })

  const [newCopy, setNewCopy] = useState({
    expl_cb: '',
    expl_cote: '',
    expl_section: '',
    expl_codestat: ''
  })

  const [authorResults, setAuthorResults] = useState<Author[]>([])
  const [publisherResults, setPublisherResults] = useState<{ ed_id: number; ed_name: string }[]>([])
  const [sections, setSections] = useState<{ idsection: number; section_libelle: string }[]>([])
  const [codeStats, setCodeStats] = useState<{ idcode: number; codestat_libelle: string }[]>([])
  const [catalogingStep, setCatalogingStep] = useState(1)

  const [newUser, setNewUser] = useState({
    empr_nom: '',
    empr_prenom: '',
    empr_cb: '',
    empr_mail: '',
    empr_tel1: '',
    empr_sexe: 0,
    empr_year: new Date().getFullYear(),
    empr_ville: 'Valencia',
    empr_date_adhesion: new Date().toISOString().split('T')[0],
    empr_date_expiration: (() => {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      return d.toISOString().split('T')[0]
    })(),
    empr_categ: 6,
    groupId: ''
  })

  const [userCategories, setUserCategories] = useState<{ id_categ_empr: number; libelle: string }[]>([])

  // Nuevo préstamo
  const [newLoan, setNewLoan] = useState({ expl_cb: '', id_empr: '' })
  const [loanUserQuery, setLoanUserQuery] = useState('')
  const [loanUserResults, setLoanUserResults] = useState<User[]>([])
  const [loanCopyQuery, setLoanCopyQuery] = useState('')
  const [loanCopyResults, setLoanCopyResults] = useState<AvailableCopy[]>([])
  const [loanFeedback, setLoanFeedback] = useState('')
  const [maxRenewals, setMaxRenewals] = useState(2)
  const [quickReturnBarcode, setQuickReturnBarcode] = useState('')
  const [quickReturnFeedback, setQuickReturnFeedback] = useState('')

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

  // Informes / Reports states
  const [reportsOverdueLoans, setReportsOverdueLoans] = useState<any[]>([])
  const [reportsActiveLoans, setReportsActiveLoans] = useState<any[]>([])
  const [reportsBasketItems, setReportsBasketItems] = useState<any[]>([])
  const [reportsSelectedGroupsOverdue, setReportsSelectedGroupsOverdue] = useState<string[]>([])
  const [reportsSelectedGroupsActive, setReportsSelectedGroupsActive] = useState<string[]>([])
  const [barcodeStart, setBarcodeStart] = useState('')
  const [barcodeCount, setBarcodeCount] = useState('24')
  const [reportsLoadingState, setReportsLoadingState] = useState(false)

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
    empr_tel1: '',
    empr_sexe: 0,
    empr_year: 0,
    empr_ville: '',
    empr_date_adhesion: '',
    empr_date_expiration: '',
    empr_categ: 6,
    groupId: ''
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
    const fetchGroupsAndCategoriesAndMetadata = async () => {
      try {
        const [gRes, cRes, mRes] = await Promise.all([
          fetch('/api/groups'),
          fetch('/api/users/categories'),
          fetch('/api/books/metadata')
        ])
        const gData = await gRes.json()
        if (gData.success) {
          setGroups(gData.data || [])
        }
        const cData = await cRes.json()
        if (cData.success) {
          setUserCategories(cData.data || [])
        }
        const mData = await mRes.json()
        if (mData.success) {
          setSections(mData.data.sections || [])
          setCodeStats(mData.data.codeStats || [])
        }
      } catch (error) {
        console.error('Error loading groups, categories or copy metadata:', error)
      }
    }
    fetchGroupsAndCategoriesAndMetadata()
  }, [session])

  const fetchNextUserBarcode = useCallback(async () => {
    try {
      const res = await fetch('/api/users?nextBarcode=true')
      const data = await res.json()
      if (data.success && data.data && data.data.nextBarcode) {
        setNewUser(prev => ({ ...prev, empr_cb: data.data.nextBarcode }))
      }
    } catch (err) {
      console.error('Error fetching next user barcode:', err)
    }
  }, [])

  useEffect(() => {
    if (session && activeTab === 'users') {
      fetchNextUserBarcode()
    }
  }, [session, activeTab, refreshKey, fetchNextUserBarcode])

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
    if (!session || activeTab !== 'reports') return
    const loadReportsData = async () => {
      setReportsLoadingState(true)
      try {
        const [delaysRes, loansRes, basketRes] = await Promise.all([
          fetch('/api/reports/delays'),
          fetch('/api/reports/loans'),
          fetch('/api/baskets/tejuelos')
        ])
        const delaysData = await delaysRes.json()
        if (delaysData.success) {
          setReportsOverdueLoans(delaysData.data || [])
        }
        const loansData = await loansRes.json()
        if (loansData.success) {
          setReportsActiveLoans(loansData.data || [])
        }
        const basketData = await basketRes.json()
        if (basketData.success) {
          setReportsBasketItems(basketData.data || [])
        }
      } catch (err) {
        console.error('Error loading reports data:', err)
      } finally {
        setReportsLoadingState(false)
      }
    }
    loadReportsData()
  }, [session, activeTab, refreshKey])

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

  const handleQuickReturn = async (e: React.FormEvent) => {
    e.preventDefault()
    setQuickReturnFeedback('')
    const barcode = quickReturnBarcode.trim()
    if (!barcode) return

    try {
      const res = await fetch('/api/loans/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expl_cb: barcode })
      })
      const data = await res.json()
      if (data.success) {
        setQuickReturnFeedback(`Devuelto: Ejemplar #${data.data.explId} devuelto correctamente.`)
        setQuickReturnBarcode('')
        setRefreshKey(k => k + 1)
        setTimeout(() => {
          quickReturnInputRef.current?.focus()
        }, 50)
      } else {
        setQuickReturnFeedback(`Error: ${data.error || 'No se pudo registrar la devolución'}`)
      }
    } catch {
      setQuickReturnFeedback('Error de red al procesar devolución')
    }
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

  const searchAuthors = async (q: string) => {
    setNewBook(prev => ({ ...prev, author_name: q }))
    if (!q.trim()) {
      setAuthorResults([])
      return
    }
    try {
      const res = await fetch(`/api/books/authors?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (data.success) {
        setAuthorResults(data.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const addAuthorInline = async () => {
    const name = newBook.author_name.trim()
    if (!name) return
    try {
      const res = await fetch('/api/books/authors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setNewBook(prev => ({ ...prev, author_id: String(data.data.author_id) }))
        alert('Autor creado y seleccionado con éxito')
        setAuthorResults([])
      } else {
        alert(data.error || 'Error al crear autor')
      }
    } catch (err) {
      console.error(err)
      alert('Error de red al crear autor')
    }
  }

  const searchPublishers = async (q: string) => {
    setNewBook(prev => ({ ...prev, ed_name: q }))
    if (!q.trim()) {
      setPublisherResults([])
      return
    }
    try {
      const res = await fetch(`/api/books/publishers?q=${encodeURIComponent(q)}`)
      const data = await res.json()
      if (data.success) {
        setPublisherResults(data.data || [])
      }
    } catch (err) {
      console.error(err)
    }
  }

  const addPublisherInline = async () => {
    const name = newBook.ed_name.trim()
    if (!name) return
    try {
      const res = await fetch('/api/books/publishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name })
      })
      const data = await res.json()
      if (data.success && data.data) {
        setNewBook(prev => ({ ...prev, ed_id: String(data.data.ed_id) }))
        alert('Editorial creada y seleccionada con éxito')
        setPublisherResults([])
      } else {
        alert(data.error || 'Error al crear editorial')
      }
    } catch (err) {
      console.error(err)
      alert('Error de red al crear editorial')
    }
  }

  const triggerCoteCalculation = (bookState: typeof newBook, authorName: string, sectionId: string) => {
    let shelfOrLang = 'C-7'
    if (bookState.code_langue === 'eng') {
      shelfOrLang = 'ING'
    } else if (bookState.code_langue === 'cat') {
      shelfOrLang = 'VAL'
    }

    let course = ''
    const secNum = Number(sectionId)
    if (secNum === 11 || secNum === 12 || secNum === 26) {
      course = '1y2PRI'
    } else if (secNum === 13 || secNum === 25) {
      course = '3y4 ESO'
    }

    let authorInitials = ''
    if (authorName) {
      const cleanAuthor = authorName.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]/g, '').trim()
      authorInitials = cleanAuthor.substring(0, 3).toUpperCase()
    }

    let abbrevTitle = ''
    if (bookState.tit1) {
      const cleanTitle = bookState.tit1.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '').trim()
      abbrevTitle = cleanTitle.substring(0, 7).toLowerCase()
    }

    const calculated = `${shelfOrLang} ${course} ${authorInitials} ${abbrevTitle}`.replace(/\s+/g, ' ').trim()
    setNewCopy(prev => ({ ...prev, expl_cote: calculated }))
  }

  const createBook = async (e: React.FormEvent) => {
    e.preventDefault()

    if (catalogingStep === 1) {
      setCatalogingStep(2)
      // fetch next barcode sequentially
      try {
        const res = await fetch('/api/books/copies?next=1')
        const data = await res.json()
        if (data.success && data.data && data.data.nextBarcode) {
          setNewCopy(prev => ({ ...prev, expl_cb: data.data.nextBarcode }))
        }
      } catch (err) {
        console.error('Error fetching next barcode:', err)
      }
      // Calculate cote
      triggerCoteCalculation(
        newBook,
        newBook.author_name,
        newCopy.expl_section || (sections[0]?.idsection ? String(sections[0].idsection) : '')
      )
      return
    }

    const res = await fetch('/api/books/advanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        book: {
          tit1: newBook.tit1,
          author_id: newBook.author_id ? Number(newBook.author_id) : undefined,
          ed1_id: newBook.ed_id ? Number(newBook.ed_id) : undefined,
          year: newBook.year || undefined,
          npages: newBook.npages || undefined,
          code_langue: newBook.code_langue,
          code: newBook.code
        },
        copy: {
          expl_cb: newCopy.expl_cb,
          expl_cote: newCopy.expl_cote,
          expl_section: newCopy.expl_section ? Number(newCopy.expl_section) : (sections[0]?.idsection || 13),
          expl_codestat: newCopy.expl_codestat ? Number(newCopy.expl_codestat) : (codeStats[0]?.idcode || 11)
        }
      })
    })

    const data = await res.json()
    if (!res.ok || !data.success) {
      alert(data.error || 'No se pudo crear el libro')
      return
    }

    if (data.data && data.data.expl_cb) {
      setCreatedBookBarcode(data.data.expl_cb)
      setPrintBarcodeValue(data.data.expl_cb)
      setPrintBarcodeTitle(newBook.tit1)
      setShowCreatedBookAlert(true)
    }

    // Reset forms
    setNewBook({
      tit1: '',
      year: '',
      code: '',
      author_name: '',
      author_id: '',
      ed_name: '',
      ed_id: '',
      npages: '',
      code_langue: 'spa'
    })
    setNewCopy({
      expl_cb: '',
      expl_cote: '',
      expl_section: sections[0]?.idsection ? String(sections[0].idsection) : '',
      expl_codestat: codeStats[0]?.idcode ? String(codeStats[0].idcode) : ''
    })
    setCatalogingStep(1)
    setBooksPagination(prev => ({ ...prev, page: 1 }))
    setRefreshKey(k => k + 1)
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
    setNewUser({
      empr_nom: '',
      empr_prenom: '',
      empr_cb: '',
      empr_mail: '',
      empr_tel1: '',
      empr_sexe: 0,
      empr_year: new Date().getFullYear(),
      empr_ville: 'Valencia',
      empr_date_adhesion: new Date().toISOString().split('T')[0],
      empr_date_expiration: (() => {
        const d = new Date()
        d.setFullYear(d.getFullYear() + 1)
        return d.toISOString().split('T')[0]
      })(),
      empr_categ: 6,
      groupId: ''
    })
    setUsersPagination(prev => ({ ...prev, page: 1 }))
    setRefreshKey(k => k + 1)
    fetchNextUserBarcode()
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
      empr_tel1: user.empr_tel1 || '',
      empr_sexe: user.empr_sexe || 0,
      empr_year: user.empr_year || 0,
      empr_ville: user.empr_ville || 'Valencia',
      empr_date_adhesion: user.empr_date_adhesion || '',
      empr_date_expiration: user.empr_date_expiration || '',
      empr_categ: user.empr_categ || 6,
      groupId: user.groupId !== undefined ? String(user.groupId) : ''
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
        <button className={`${styles.navButton} ${activeTab === 'reports' ? styles.active : ''}`} onClick={() => setActiveTab('reports')}>
          Informes
        </button>
        <button className={styles.logoutButton} onClick={logout}>Salir</button>
      </nav>

      <main className={styles.content}>
        {activeTab === 'books' && (
          <section>
            <h2>Libros</h2>

            {catalogingStep === 1 ? (
              <form className={styles.formGrid} onSubmit={createBook} style={{ marginBottom: '2rem' }}>
                <div className={styles.formGridTitle}>Catalogación Avanzada - Paso 1: Ficha del Libro</div>
                
                <div className={styles.formGridGroup}>
                  <label>Título propio *</label>
                  <input className={styles.textInput} placeholder="Título del libro" value={newBook.tit1} onChange={(e) => setNewBook(prev => ({ ...prev, tit1: e.target.value }))} required />
                </div>
                
                <div className={styles.formGridGroup}>
                  <label>ISBN / Código *</label>
                  <input className={styles.textInput} placeholder="ISBN o Código" value={newBook.code} onChange={(e) => setNewBook(prev => ({ ...prev, code: e.target.value }))} required />
                </div>
                
                <div className={styles.formGridGroup}>
                  <label>Año de edición</label>
                  <input className={styles.textInput} placeholder="Año (ej: 2012)" value={newBook.year} onChange={(e) => setNewBook(prev => ({ ...prev, year: e.target.value }))} />
                </div>

                <div className={styles.formGridGroup} style={{ position: 'relative' }}>
                  <label>Autor principal</label>
                  <div className={styles.searchInline}>
                    <input
                      className={styles.textInput}
                      placeholder="Buscar o escribir autor..."
                      value={newBook.author_name}
                      onChange={(e) => searchAuthors(e.target.value)}
                    />
                    <button type="button" onClick={addAuthorInline}>+ Crear</button>
                  </div>
                  {authorResults.length > 0 && (
                    <ul className={styles.searchResultList} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto' }}>
                      {authorResults.map(a => (
                        <li key={a.author_id} onClick={() => {
                          setNewBook(prev => ({ ...prev, author_name: a.author_name, author_id: String(a.author_id) }))
                          setAuthorResults([])
                        }} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                          {a.author_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={styles.formGridGroup} style={{ position: 'relative' }}>
                  <label>Editorial</label>
                  <div className={styles.searchInline}>
                    <input
                      className={styles.textInput}
                      placeholder="Buscar o escribir editorial..."
                      value={newBook.ed_name}
                      onChange={(e) => searchPublishers(e.target.value)}
                    />
                    <button type="button" onClick={addPublisherInline}>+ Crear</button>
                  </div>
                  {publisherResults.length > 0 && (
                    <ul className={styles.searchResultList} style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'white', border: '1px solid var(--border)', maxHeight: '150px', overflowY: 'auto' }}>
                      {publisherResults.map(p => (
                        <li key={p.ed_id} onClick={() => {
                          setNewBook(prev => ({ ...prev, ed_name: p.ed_name, ed_id: String(p.ed_id) }))
                          setPublisherResults([])
                        }} style={{ padding: '0.4rem 0.8rem', cursor: 'pointer' }}>
                          {p.ed_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className={styles.formGridGroup}>
                  <label>Colación (Páginas)</label>
                  <input className={styles.textInput} placeholder="Número de páginas" value={newBook.npages} onChange={(e) => setNewBook(prev => ({ ...prev, npages: e.target.value }))} />
                </div>

                <div className={styles.formGridGroup}>
                  <label>Idioma</label>
                  <select className={styles.selectField} value={newBook.code_langue} onChange={(e) => setNewBook(prev => ({ ...prev, code_langue: e.target.value }))}>
                    <option value="spa">Español (spa)</option>
                    <option value="cat">Catalán / Valenciano (cat)</option>
                    <option value="eng">Inglés (eng)</option>
                    <option value="fra">Francés (fra)</option>
                  </select>
                </div>

                <div className={styles.formGridActions}>
                  <button type="submit" className={styles.primaryButton}>Siguiente: Ficha del Ejemplar</button>
                </div>
              </form>
            ) : (
              <form className={styles.formGrid} onSubmit={createBook} style={{ marginBottom: '2rem' }}>
                <div className={styles.formGridTitle}>Catalogación Avanzada - Paso 2: Ficha del Ejemplar</div>
                
                <div className={styles.formGridGroup}>
                  <label>Código de barras del colegio *</label>
                  <input
                    className={styles.textInput}
                    placeholder="Código del ejemplar"
                    value={newCopy.expl_cb}
                    onChange={(e) => setNewCopy(prev => ({ ...prev, expl_cb: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGridGroup}>
                  <label>Sección *</label>
                  <select
                    className={styles.selectField}
                    value={newCopy.expl_section}
                    onChange={(e) => {
                      const secId = e.target.value
                      setNewCopy(prev => ({ ...prev, expl_section: secId }))
                      triggerCoteCalculation(newBook, newBook.author_name, secId)
                    }}
                    required
                  >
                    <option value="">Selecciona sección...</option>
                    {sections.map(s => (
                      <option key={s.idsection} value={s.idsection}>{s.section_libelle}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGridGroup}>
                  <label>Código Estadístico *</label>
                  <select
                    className={styles.selectField}
                    value={newCopy.expl_codestat}
                    onChange={(e) => setNewCopy(prev => ({ ...prev, expl_codestat: e.target.value }))}
                    required
                  >
                    <option value="">Selecciona cód. estadístico...</option>
                    {codeStats.map(c => (
                      <option key={c.idcode} value={c.idcode}>{c.codestat_libelle}</option>
                    ))}
                  </select>
                </div>

                <div className={styles.formGridGroup}>
                  <label>Signatura calculada (Editable) *</label>
                  <input
                    className={styles.textInput}
                    placeholder="Signatura (ej: C-7 1y2PRI CER don qui)"
                    value={newCopy.expl_cote}
                    onChange={(e) => setNewCopy(prev => ({ ...prev, expl_cote: e.target.value }))}
                    required
                  />
                </div>

                <div className={styles.formGridActions} style={{ display: 'flex', gap: '1rem' }}>
                  <button type="button" style={{ background: 'var(--border)', color: 'var(--text-main)', border: 'none', padding: '0.6rem 1.2rem', borderRadius: 'var(--radius)', cursor: 'pointer' }} onClick={() => setCatalogingStep(1)}>Atrás</button>
                  <button type="submit" className={styles.primaryButton}>Guardar y Añadir a Tejuelos</button>
                </div>
              </form>
            )}

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

            <form className={styles.formGrid} onSubmit={createUser}>
              <div className={styles.formGridTitle}>Nuevo Usuario (Ficha Personal)</div>
              
              <div className={styles.formGridGroup}>
                <label>Apellido *</label>
                <input className={styles.textInput} placeholder="Apellido" value={newUser.empr_nom} onChange={(e) => setNewUser(prev => ({ ...prev, empr_nom: e.target.value }))} required />
              </div>
              <div className={styles.formGridGroup}>
                <label>Nombre *</label>
                <input className={styles.textInput} placeholder="Nombre" value={newUser.empr_prenom} onChange={(e) => setNewUser(prev => ({ ...prev, empr_prenom: e.target.value }))} required />
              </div>
              <div className={styles.formGridGroup}>
                <label>Carné / Código de Barras</label>
                <input className={styles.textInput} placeholder="Carne" value={newUser.empr_cb} onChange={(e) => setNewUser(prev => ({ ...prev, empr_cb: e.target.value }))} />
              </div>
              <div className={styles.formGridGroup}>
                <label>Sexo</label>
                <select className={styles.selectField} value={newUser.empr_sexe} onChange={(e) => setNewUser(prev => ({ ...prev, empr_sexe: parseInt(e.target.value, 10) }))}>
                  <option value={0}>No especificado</option>
                  <option value={1}>Hombre</option>
                  <option value={2}>Mujer</option>
                </select>
              </div>
              <div className={styles.formGridGroup}>
                <label>Año de Nacimiento</label>
                <input className={styles.textInput} type="number" min={1900} max={new Date().getFullYear()} value={newUser.empr_year} onChange={(e) => setNewUser(prev => ({ ...prev, empr_year: parseInt(e.target.value, 10) || 0 }))} />
              </div>
              <div className={styles.formGridGroup}>
                <label>Población</label>
                <input className={styles.textInput} placeholder="Poblacion" value={newUser.empr_ville} onChange={(e) => setNewUser(prev => ({ ...prev, empr_ville: e.target.value }))} />
              </div>
              <div className={styles.formGridGroup}>
                <label>Categoría</label>
                <select className={styles.selectField} value={newUser.empr_categ} onChange={(e) => setNewUser(prev => ({ ...prev, empr_categ: parseInt(e.target.value, 10) }))}>
                  {userCategories.map(c => (
                    <option key={c.id_categ_empr} value={c.id_categ_empr}>{c.libelle}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGridGroup}>
                <label>Añadir al Grupo / Curso</label>
                <select className={styles.selectField} value={newUser.groupId} onChange={(e) => setNewUser(prev => ({ ...prev, groupId: e.target.value }))}>
                  <option value="">Ninguno</option>
                  {groups.map(g => (
                    <option key={g.id_groupe} value={g.id_groupe}>{g.libelle_groupe}</option>
                  ))}
                </select>
              </div>
              <div className={styles.formGridGroup}>
                <label>Email</label>
                <input className={styles.textInput} type="email" placeholder="Email" value={newUser.empr_mail} onChange={(e) => setNewUser(prev => ({ ...prev, empr_mail: e.target.value }))} />
              </div>
              <div className={styles.formGridGroup}>
                <label>Teléfono</label>
                <input className={styles.textInput} placeholder="Telefono" value={newUser.empr_tel1} onChange={(e) => setNewUser(prev => ({ ...prev, empr_tel1: e.target.value }))} />
              </div>
              <div className={styles.formGridGroup}>
                <label>Válido Desde</label>
                <input className={styles.textInput} type="date" value={newUser.empr_date_adhesion} onChange={(e) => setNewUser(prev => ({ ...prev, empr_date_adhesion: e.target.value }))} />
              </div>
              <div className={styles.formGridGroup}>
                <label>Válido Hasta</label>
                <input className={styles.textInput} type="date" value={newUser.empr_date_expiration} onChange={(e) => setNewUser(prev => ({ ...prev, empr_date_expiration: e.target.value }))} />
              </div>

              <div className={styles.formGridActions}>
                <button type="submit" className={styles.primaryButton}>+ Registrar Usuario</button>
              </div>
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
                          <button onClick={() => window.open(`/api/users/card?id=${user.id_empr}`, '_blank')}>Carnet</button>
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

              <div className={styles.configCard} style={{ gridColumn: 'span 2' }}>
                <h3>Promoción Masiva (Paso de Cursos)</h3>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                  Esta utilidad permite traspasar masivamente todos los alumnos de un grupo a otro (por ejemplo, de &quot;ESO 3º&quot; a &quot;ESO 4º&quot;).
                </p>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap', width: '100%' }}>
                  <div className={styles.formGridGroup} style={{ flex: 1, minWidth: '150px' }}>
                    <label>Grupo Origen</label>
                    <select id="promoFromGroup" defaultValue="" className={styles.selectField}>
                      <option value="">Seleccionar...</option>
                      {groups.map(g => (
                        <option key={g.id_groupe} value={g.id_groupe}>{g.libelle_groupe}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: '1.2rem', alignSelf: 'center', marginTop: '1.2rem' }}>&rarr;</div>
                  <div className={styles.formGridGroup} style={{ flex: 1, minWidth: '150px' }}>
                    <label>Grupo Destino</label>
                    <select id="promoToGroup" defaultValue="" className={styles.selectField}>
                      <option value="">Seleccionar...</option>
                      {groups.map(g => (
                        <option key={g.id_groupe} value={g.id_groupe}>{g.libelle_groupe}</option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    style={{ alignSelf: 'flex-end', marginTop: '1.2rem' }}
                    onClick={async () => {
                      const fromSelect = document.getElementById('promoFromGroup') as HTMLSelectElement
                      const toSelect = document.getElementById('promoToGroup') as HTMLSelectElement
                      const fromId = fromSelect.value
                      const toId = toSelect.value
                      if (!fromId || !toId) {
                        alert('Por favor, selecciona ambos grupos')
                        return
                      }
                      if (fromId === toId) {
                        alert('Los grupos de origen y destino deben ser distintos')
                        return
                      }
                      const fromText = fromSelect.options[fromSelect.selectedIndex].text
                      const toText = toSelect.options[toSelect.selectedIndex].text
                      if (!confirm(`¿Seguro que deseas mover TODOS los alumnos de "${fromText}" a "${toText}"?`)) return
                      
                      try {
                        const res = await fetch('/api/groups/promote', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ fromGroupId: fromId, toGroupId: toId })
                        })
                        const data = await res.json()
                        if (data.success) {
                          alert('Promoción realizada correctamente')
                          fromSelect.value = ''
                          toSelect.value = ''
                          setRefreshKey(k => k + 1)
                        } else {
                          alert(data.error || 'Error al realizar la promoción')
                        }
                      } catch (err) {
                        console.error(err)
                        alert('Error de red al realizar la promoción')
                      }
                    }}
                  >
                    Promocionar Alumnos
                  </button>
                </div>
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

            {/* Devolución rápida */}
            <details className={styles.newLoanPanel}>
              <summary>+ Devolución rápida (Escanear libro)</summary>
              <form onSubmit={handleQuickReturn} className={styles.newLoanForm} style={{ borderTop: 'none', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                <div className={styles.loanFormFields}>
                  <div className={styles.loanSearchBlock} style={{ maxWidth: '400px' }}>
                    <label>Código de barras del ejemplar</label>
                    <input
                      ref={quickReturnInputRef}
                      className={styles.textInput}
                      placeholder="Escanear o introducir código de barras..."
                      value={quickReturnBarcode}
                      onChange={(e) => setQuickReturnBarcode(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div className={styles.loanFormActions}>
                  <button type="submit" className={styles.primaryButton}>Registrar Devolución</button>
                </div>
              </form>
              {quickReturnFeedback && (
                <p className={quickReturnFeedback.startsWith('Error') ? styles.errorText : styles.successText}>
                  {quickReturnFeedback}
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

        {activeTab === 'reports' && (
          <section>
            <h2>Informes y Utilidades</h2>
            {reportsLoadingState && (
              <div className={styles.loadingFirst}>Cargando datos de informes...</div>
            )}

            <div className={styles.configGrid} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
              
              {/* Card 1: Retrasos por Cursos */}
              <div className={styles.configCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Avisos de Retraso</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Generación de cartas de retraso grupales</span>
                </div>
                
                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 'var(--radius)' }}>
                  {groups.map(g => {
                    const isChecked = reportsSelectedGroupsOverdue.includes(String(g.id_groupe))
                    const count = reportsOverdueLoans.filter(l => l.id_groupe === g.id_groupe).length
                    return (
                      <label key={g.id_groupe} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReportsSelectedGroupsOverdue(prev => [...prev, String(g.id_groupe)])
                            } else {
                              setReportsSelectedGroupsOverdue(prev => prev.filter(id => id !== String(g.id_groupe)))
                            }
                          }}
                        />
                        <span>{g.libelle_groupe}</span>
                        {count > 0 && <span style={{ marginLeft: 'auto', background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>{count} retrasos</span>}
                      </label>
                    )
                  })}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={reportsSelectedGroupsOverdue.includes('Sin Curso')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setReportsSelectedGroupsOverdue(prev => [...prev, 'Sin Curso'])
                        } else {
                          setReportsSelectedGroupsOverdue(prev => prev.filter(id => id !== 'Sin Curso'))
                        }
                      }}
                    />
                    <span>Sin Curso / Profesores</span>
                    {reportsOverdueLoans.filter(l => l.libelle_groupe === 'Sin Curso').length > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#fee2e2', color: '#b91c1c', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>
                        {reportsOverdueLoans.filter(l => l.libelle_groupe === 'Sin Curso').length} retrasos
                      </span>
                    )}
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                  <button
                    type="button"
                    style={{ background: 'var(--border)', color: 'var(--text-main)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => setReportsSelectedGroupsOverdue(groups.map(g => String(g.id_groupe)).concat('Sin Curso'))}
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    style={{ background: 'var(--border)', color: 'var(--text-main)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => setReportsSelectedGroupsOverdue([])}
                  >
                    Desmarcar todos
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.primaryButton}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => {
                    if (reportsSelectedGroupsOverdue.length === 0) {
                      alert('Por favor, selecciona al menos un grupo')
                      return
                    }
                    window.open(`/api/reports/delays?format=pdf&groupIds=${reportsSelectedGroupsOverdue.join(',')}`, '_blank')
                  }}
                >
                  📄 Imprimir Cartas de Retraso (PDF)
                </button>
              </div>

              {/* Card 2: Préstamos Activos */}
              <div className={styles.configCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Préstamos Activos</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Listados de libros prestados agrupados por curso</span>
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 'var(--radius)' }}>
                  {groups.map(g => {
                    const isChecked = reportsSelectedGroupsActive.includes(String(g.id_groupe))
                    const count = reportsActiveLoans.filter(l => l.id_groupe === g.id_groupe).length
                    return (
                      <label key={g.id_groupe} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setReportsSelectedGroupsActive(prev => [...prev, String(g.id_groupe)])
                            } else {
                              setReportsSelectedGroupsActive(prev => prev.filter(id => id !== String(g.id_groupe)))
                            }
                          }}
                        />
                        <span>{g.libelle_groupe}</span>
                        {count > 0 && <span style={{ marginLeft: 'auto', background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>{count} préstamos</span>}
                      </label>
                    )
                  })}
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', cursor: 'pointer', fontSize: '0.9rem' }}>
                    <input
                      type="checkbox"
                      checked={reportsSelectedGroupsActive.includes('Sin Curso')}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setReportsSelectedGroupsActive(prev => [...prev, 'Sin Curso'])
                        } else {
                          setReportsSelectedGroupsActive(prev => prev.filter(id => id !== 'Sin Curso'))
                        }
                      }}
                    />
                    <span>Sin Curso / Profesores</span>
                    {reportsActiveLoans.filter(l => l.libelle_groupe === 'Sin Curso').length > 0 && (
                      <span style={{ marginLeft: 'auto', background: '#e0f2fe', color: '#0369a1', fontSize: '0.75rem', padding: '0.1rem 0.4rem', borderRadius: '10px', fontWeight: 'bold' }}>
                        {reportsActiveLoans.filter(l => l.libelle_groupe === 'Sin Curso').length} préstamos
                      </span>
                    )}
                  </label>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: 'auto' }}>
                  <button
                    type="button"
                    style={{ background: 'var(--border)', color: 'var(--text-main)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => setReportsSelectedGroupsActive(groups.map(g => String(g.id_groupe)).concat('Sin Curso'))}
                  >
                    Marcar todos
                  </button>
                  <button
                    type="button"
                    style={{ background: 'var(--border)', color: 'var(--text-main)', border: 'none', padding: '0.4rem 0.8rem', borderRadius: 'var(--radius)', fontSize: '0.85rem', cursor: 'pointer' }}
                    onClick={() => setReportsSelectedGroupsActive([])}
                  >
                    Desmarcar todos
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.primaryButton}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem' }}
                  onClick={() => {
                    if (reportsSelectedGroupsActive.length === 0) {
                      alert('Por favor, selecciona al menos un grupo')
                      return
                    }
                    window.open(`/api/reports/loans?format=pdf&groupIds=${reportsSelectedGroupsActive.join(',')}`, '_blank')
                  }}
                >
                  📄 Imprimir Préstamos Activos (PDF)
                </button>
              </div>

              {/* Card 3: Cesta de Tejuelos */}
              <div className={styles.configCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Cesta de Tejuelos</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Etiquetas listas para imprimir (26mm x 25mm)</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Elementos en la cesta: <strong>{reportsBasketItems.length}</strong></span>
                  {reportsBasketItems.length > 0 && (
                    <button
                      type="button"
                      style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', padding: '0.3rem 0.6rem', borderRadius: 'var(--radius)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}
                      onClick={async () => {
                        if (!confirm('¿Seguro que deseas vaciar la cesta de tejuelos?')) return
                        try {
                          const res = await fetch('/api/baskets/tejuelos', { method: 'DELETE' })
                          const data = await res.json()
                          if (data.success) {
                            alert('Cesta vaciada con éxito')
                            setRefreshKey(k => k + 1)
                          }
                        } catch (err) {
                          console.error(err)
                        }
                      }}
                    >
                      Vaciar Cesta
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: '180px', overflowY: 'auto', border: '1px solid var(--border)', padding: '0.5rem', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}>
                  {reportsBasketItems.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-secondary)' }}>Cesta vacía. Agregue libros desde Catálogo.</div>
                  ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)' }}>
                          <th style={{ padding: '0.2rem' }}>Libro</th>
                          <th style={{ padding: '0.2rem' }}>Barra</th>
                          <th style={{ padding: '0.2rem' }}>Signatura</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportsBasketItems.map(item => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '0.2rem', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.tit1}</td>
                            <td style={{ padding: '0.2rem' }}>{item.expl_cb}</td>
                            <td style={{ padding: '0.2rem', fontFamily: 'monospace' }}>{item.expl_cote}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.primaryButton}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}
                  disabled={reportsBasketItems.length === 0}
                  onClick={() => {
                    window.open('/api/baskets/tejuelos/print', '_blank')
                  }}
                >
                  🖨️ Imprimir Tejuelos en Cesta (PDF)
                </button>
              </div>

              {/* Card 4: Generador de Códigos de Barra */}
              <div className={styles.configCard} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: 'var(--primary)' }}>Códigos de Barra Secuenciales</h3>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Generador libre de etiquetas adhesivas en PDF</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className={styles.formGridGroup}>
                    <label>Código de barra inicial *</label>
                    <div className={styles.searchInline}>
                      <input
                        className={styles.textInput}
                        placeholder="Ej: 10001 o 010001"
                        value={barcodeStart}
                        onChange={(e) => setBarcodeStart(e.target.value)}
                      />
                      <button
                        type="button"
                        style={{ padding: '0.65rem 1rem' }}
                        onClick={async () => {
                          try {
                            const res = await fetch('/api/books/copies?next=1')
                            const data = await res.json()
                            if (data.success && data.data && data.data.nextBarcode) {
                              setBarcodeStart(data.data.nextBarcode)
                            }
                          } catch (err) {
                            console.error(err)
                          }
                        }}
                      >
                        Siguiente libre
                      </button>
                    </div>
                  </div>

                  <div className={styles.formGridGroup}>
                    <label>Cantidad a generar *</label>
                    <select
                      className={styles.selectField}
                      value={barcodeCount}
                      onChange={(e) => setBarcodeCount(e.target.value)}
                    >
                      <option value="24">24 etiquetas (1 página)</option>
                      <option value="48">48 etiquetas (2 páginas)</option>
                      <option value="72">72 etiquetas (3 páginas)</option>
                      <option value="96">96 etiquetas (4 páginas)</option>
                      <option value="120">120 etiquetas (5 páginas)</option>
                    </select>
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.primaryButton}
                  style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', marginTop: 'auto' }}
                  onClick={() => {
                    if (!barcodeStart.trim()) {
                      alert('Por favor, introduce el código de barra inicial')
                      return
                    }
                    window.open(`/api/reports/barcodes?start=${barcodeStart.trim()}&count=${barcodeCount}`, '_blank')
                  }}
                >
                  🖨️ Generar y Descargar PDF
                </button>
              </div>

            </div>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_nom">Apellido</label>
                    <input
                      id="edit_user_nom"
                      className={styles.textInput}
                      value={editingUserForm.empr_nom}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_nom: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_prenom">Nombre</label>
                    <input
                      id="edit_user_prenom"
                      className={styles.textInput}
                      value={editingUserForm.empr_prenom}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_prenom: e.target.value }))}
                      required
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_cb">Carné</label>
                    <input
                      id="edit_user_cb"
                      className={styles.textInput}
                      value={editingUserForm.empr_cb}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_cb: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_sexe">Sexo</label>
                    <select
                      id="edit_user_sexe"
                      className={styles.selectField}
                      value={editingUserForm.empr_sexe}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_sexe: parseInt(e.target.value, 10) }))}
                    >
                      <option value={0}>No especificado</option>
                      <option value={1}>Hombre</option>
                      <option value={2}>Mujer</option>
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_year">Año de Nacimiento</label>
                    <input
                      id="edit_user_year"
                      type="number"
                      className={styles.textInput}
                      value={editingUserForm.empr_year}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_year: parseInt(e.target.value, 10) || 0 }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_ville">Población</label>
                    <input
                      id="edit_user_ville"
                      className={styles.textInput}
                      value={editingUserForm.empr_ville}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_ville: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_categ">Categoría</label>
                    <select
                      id="edit_user_categ"
                      className={styles.selectField}
                      value={editingUserForm.empr_categ}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_categ: parseInt(e.target.value, 10) }))}
                    >
                      {userCategories.map(c => (
                        <option key={c.id_categ_empr} value={c.id_categ_empr}>{c.libelle}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_group">Grupo / Curso</label>
                    <select
                      id="edit_user_group"
                      className={styles.selectField}
                      value={editingUserForm.groupId}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, groupId: e.target.value }))}
                    >
                      <option value="">Ninguno</option>
                      {groups.map(g => (
                        <option key={g.id_groupe} value={g.id_groupe}>{g.libelle_groupe}</option>
                      ))}
                    </select>
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_mail">Email</label>
                    <input
                      id="edit_user_mail"
                      type="email"
                      className={styles.textInput}
                      value={editingUserForm.empr_mail}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_mail: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_tel">Teléfono</label>
                    <input
                      id="edit_user_tel"
                      className={styles.textInput}
                      value={editingUserForm.empr_tel1}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_tel1: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_adhesion">Válido Desde</label>
                    <input
                      id="edit_user_adhesion"
                      type="date"
                      className={styles.textInput}
                      value={editingUserForm.empr_date_adhesion || ''}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_date_adhesion: e.target.value }))}
                    />
                  </div>
                  <div className={styles.modalFormGroup}>
                    <label htmlFor="edit_user_expiration">Válido Hasta</label>
                    <input
                      id="edit_user_expiration"
                      type="date"
                      className={styles.textInput}
                      value={editingUserForm.empr_date_expiration || ''}
                      onChange={(e) => setEditingUserForm(prev => ({ ...prev, empr_date_expiration: e.target.value }))}
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
