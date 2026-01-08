import { http } from "@/utils/http";



export function ApiImportIdea(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/import/idea/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}