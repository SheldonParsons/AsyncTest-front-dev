import { http } from "@/utils/http";

export type MobileMessageItem = {
  id: number;
  request_id: string;
  source: string;
  message_type: "unknown" | "sms" | "imessage";
  sender: string;
  content: string;
  phone_received_at: string | null;
  device_name: string;
  created_at: string;
};

export type MobileMessageListParams = {
  search?: string;
  sender?: string;
  content?: string;
  page: number;
  page_size: number;
};

export type MobileMessageListResponse = {
  items: MobileMessageItem[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
  };
  filters: {
    search: string;
    sender: string;
    content: string;
  };
};

export function ApiGetMobileMessages(
  params: MobileMessageListParams,
): Promise<MobileMessageListResponse> {
  return http
    .httpGetResponse("/api/mobile-messages/", { params })
    .then((response) => response.data as MobileMessageListResponse);
}
