export interface Book {
  notice_id: number
  tit1: string
  year?: number
  code: string
  is_active?: boolean
}

export interface BookDetail extends Book {
  authors?: string[]
  copies?: BookCopy[]
}

export interface BookCopy {
  expl_id: number
  expl_statut: string
  expl_notice?: number
}

export interface Author {
  author_id: number
  author_name: string
}

export interface Responsibility {
  resp_id: number
  resp_notice: number
  resp_author: number
  resp_type: string
}
