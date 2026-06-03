export interface Pagination {
  page: number
  page_size: number
  total: number
}

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  pagination?: Pagination
}

export interface PaginatedListResponse<T> {
  items: T[]
  has_next: boolean
  total_pending?: boolean
}

export interface AuthUserSummary {
  id: number
  name: string
  login: string
  company_name?: string
  lang?: string
}

export interface ContactCard {
  name: string
  phone: string
  email: string
  address: string
}

export interface MeResponse {
  user: AuthUserSummary
  company: {
    id: number
    name: string
  }
  contact: ContactCard
}

export interface LoginResponse {
  need_bind?: boolean
  bind_state?: "bound" | "unbound"
  token: string
  expires_at: string
  user: AuthUserSummary
}

export interface WechatIdentityHint {
  has_unionid: boolean
  mini_openid: boolean
}

export interface WechatMiniLoginResponse {
  need_bind: boolean
  bind_state: "bound" | "unbound"
  user: AuthUserSummary | Record<string, never>
  token?: string
  expires_at?: string
  bound_mobile?: string
  wechat_identity?: WechatIdentityHint
}

export interface AuthOptionsResponse {
  wechat: {
    mock_enabled: boolean
    mini_config_ready: boolean
    web_config_ready: boolean
    web_login_mode: "real" | "mock" | "disabled"
    web_login_message: string
  }
}

export interface PcQrCreateResponse {
  session_token: string
  expires_at: string
  qr_content: string
  status_poll_seconds: number
}

export interface PcQrStatusResponse {
  status: "pending" | "confirmed" | "consumed" | "expired" | "invalid"
  expires_at?: string
  confirmed_user?: string
}

export interface PcScanCreateResponse {
  session_token: string
  expires_at: string
  qr_content: string
  status_poll_seconds: number
}

export interface PcScanResultItem {
  id: number
  result_text: string
  submitted_at?: string | false
  submitted_by?: string
}

export interface PcScanStatusResponse {
  status: "pending" | "cancelled" | "expired" | "invalid"
  expires_at?: string
  result_text?: string
  submitted_at?: string | false
  submitted_by?: string
  received_count: number
  latest_item_id: number
  results: PcScanResultItem[]
}

export interface PcScanSubmitResponse {
  status: "pending" | "cancelled" | "expired"
  received_count: number
  item: PcScanResultItem
}

export interface SaleOrderSummary {
  id: number
  name: string
  document_type: "quote" | "order"
  state: string
  status_label: string
  client_order_ref: string
  note: string
  date_order: string | false
  validity_date: string | false
  amount_total: number
  currency: string
}

export interface PickingSummary {
  id: number
  name: string
  state: string
  status_label: string
  date: string | false
  pdf_url: string | false
}

export interface DashboardCounts {
  quotes: number
  orders: number
  returns: number
}

export interface DashboardCountsResponse extends DashboardCounts {}

export interface DashboardResponse {
  counts?: DashboardCounts | null
  counts_pending?: boolean
  recent_quotes: SaleOrderSummary[]
  recent_orders: SaleOrderSummary[]
  recent_returns: PickingSummary[]
}

export type MediaDisplayProfile = "hidden" | "main_only" | "detail_basic" | "detail_full"

export interface MediaContentBlock {
  id: number
  scope_type: "sku" | "series" | "platform"
  block_type: "rich_text" | "selling_point" | "shipping_rule" | "platform_tail"
  title: string
  body_html: string
  display_profile: MediaDisplayProfile
}

export interface MediaBundle {
  display_profile: MediaDisplayProfile
  show_main_image: boolean
  show_detail_media: boolean
  main_image_url: string | false
  main_image_alt: string
  gallery_images: string[]
  detail_images: string[]
  content_blocks: MediaContentBlock[]
  resolved_main_scope: "sku" | "series" | "platform" | false
  resolved_gallery_scope: "sku" | "series" | "platform" | false
  resolved_detail_scope: "sku" | "series" | "platform" | false
}

export interface StockItem {
  id: number
  matched_by: string
  name: string
  manufacturer_code: string
  model: string
  order_code: string
  free_qty: number
  qty_available: number
  uom_name: string
  list_price: number | null
  customer_price: number | null
  discount_rate: number | null
  currency: string
  is_reference_price: boolean
  price_basis_qty: number
  main_image_url?: string | false
  media?: MediaBundle
}

export interface StockSearchResponse {
  query: string
  items: StockItem[]
  in_stock_only: boolean
  has_next: boolean
  total_pending?: boolean
}

export interface StockSearchTotalResponse {
  query: string
  in_stock_only: boolean
  total: number
}

export interface StockCatalogGradeCounts {
  A: number
  B: number
  C: number
}

export interface StockCatalogFacet {
  key: string
  value?: string
  label: string
  display_root?: string
  display_subcategory?: string
  series_count: number
  default_series_count: number
  published_series_count: number
  grade_counts: StockCatalogGradeCounts
}

export interface StockCatalogSeries {
  series_key: string
  display_root: string
  display_leaf: string
  display_major?: string
  display_subcategory?: string
  display_category?: string
  display_series?: string
  mapping_confidence: number
  mapping_basis: string
  mapping_state?: "auto" | "manual" | "unmapped"
  is_generic_series: boolean
  score: number
  grade: "A" | "B" | "C"
  default_visible: boolean
  published_visible: boolean
  visibility_source?: "auto" | "manual_on" | "manual_off"
  candidate: boolean
  signals: string[]
  sku_count: number
  priced_sku_count: number
  in_stock_sku_count: number
  available_qty: number
  sold_qty_365: number
  sold_qty_180: number
  sold_qty_90: number
  sold_orders_365: number
  sold_orders_180: number
  sold_orders_90: number
  last_sale_date: string | false
  sample_manufacturer_code: string
  sample_order_code: string
  sample_model: string
  sample_product_name: string
  source_category_path: string
  source_policy_category: string
  main_image_url?: string | false
  media?: MediaBundle
}

export interface StockCatalogOverviewResponse {
  brand: string
  brand_code: string
  generated_at: string
  in_stock_only: boolean
  history_profile: {
    history_mode: "long" | "medium" | "cold"
    history_days: number
    history_start: string | false
    history_end: string | false
    order_count: number
  }
  summary: {
    total_series: number
    candidate_series: number
    default_series: number
    published_series: number
    in_stock_series: number
    grade_counts: StockCatalogGradeCounts
  }
  roots: StockCatalogFacet[]
  subcategories?: StockCatalogFacet[]
  categories?: StockCatalogFacet[]
  leaves: StockCatalogFacet[]
  series: StockCatalogSeries[]
}

export interface StockCatalogSeriesItemsResponse {
  brand: string
  series_key: string
  series_media?: MediaBundle
  items: Array<StockItem & { series_key: string; brand_name: string }>
  in_stock_only: boolean
  has_next: boolean
}

export interface CartLine {
  id: number
  product_id: number
  manufacturer_code: string
  order_code: string
  model: string
  name: string
  quantity: number
  uom_name: string
  free_qty: number
  list_price: number
  customer_price: number
  discount_rate: number
  subtotal: number
  currency: string
  main_image_url?: string | false
  media?: MediaBundle
}

export interface CartResponse {
  id: number
  status_label: string
  currency: string
  line_count: number
  selected_line_count: number
  amount_total: number
  items: CartLine[]
}

export interface CartGenerateQuoteResponse {
  quote: SaleOrderSummary
  cart: CartResponse
}

export interface SaleOrderLine {
  id: number
  product_id: number
  product_code: string
  name: string
  quantity: number
  uom_name: string
  unit_price: number
  amount: number
  main_image_url?: string | false
  media?: MediaBundle
}

export interface SaleOrderDetail extends SaleOrderSummary {
  payment_term: string
  invoice_setting: string
  invoice_info: ContactCard
  shipping_info: ContactCard
  lines: SaleOrderLine[]
  recent_deliveries: PickingSummary[]
  returns: PickingSummary[]
  pdf_url: string
}

export interface StockMoveLine {
  id: number
  product_id: number
  product_code: string
  name: string
  planned_qty: number
  done_qty: number
  uom_name: string
}

export interface ReturnDetail {
  id: number
  name: string
  state: string
  status_label: string
  processed_date: string | false
  origin: string
  operation_type: string
  sale_order: SaleOrderSummary | false
  source_delivery: PickingSummary | false
  lines: StockMoveLine[]
  pdf_url: string | false
}

export interface DeliveryDetail {
  id: number
  name: string
  state: string
  status_label: string
  delivery_date: string | false
  origin: string
  operation_type: string
  sale_order: SaleOrderSummary | false
  related_return: PickingSummary | false
  lines: StockMoveLine[]
  pdf_url: string | false
}
