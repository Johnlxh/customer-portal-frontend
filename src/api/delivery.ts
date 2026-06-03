import type { DeliveryDetail } from "../types/api"

import { request } from "./http"

export function getDeliveryDetail(id: string | number) {
  return request<DeliveryDetail>({
    url: `/api/v1/deliveries/${id}`
  })
}
