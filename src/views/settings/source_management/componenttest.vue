<template>
  <div class="component-test">
    <AstCodeEditor
      v-model="code"
      language="python"
      fileName="asyncexecutor.py"
      :enableBusinessCompletions="true"
      height="100%"
      @run="onRun"
      @save="onSave"
    />
  </div>
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import AstCodeEditor from '@/components/common/editor/AstCodeEditor.vue';

const code = ref(`# Python 测试空间
import json
from typing import List, Dict, Optional


class ApiTestCase:
    """API 测试用例"""

    def __init__(self, name: str, url: str, method: str = "GET"):
        self.name = name
        self.url = url
        self.method = method.upper()
        self.headers: Dict[str, str] = {"Content-Type": "application/json"}
        self.body: Optional[dict] = None
        self.expected_status: int = 200

    def set_body(self, body: dict) -> "ApiTestCase":
        self.body = body
        return self

    def set_header(self, key: str, value: str) -> "ApiTestCase":
        self.headers[key] = value
        return self

    async def execute(self) -> dict:
        """执行测试用例"""
        print(f"[{self.method}] {self.url}")
        print(f"  Headers: {json.dumps(self.headers, indent=2)}")
        if self.body:
            print(f"  Body: {json.dumps(self.body, indent=2)}")
        return {"status": self.expected_status, "ok": True}


def create_test_suite(cases: List[ApiTestCase]) -> dict:
    results = []
    for case in cases:
        results.append({
            "name": case.name,
            "method": case.method,
            "url": case.url,
        })
    return {"total": len(results), "cases": results}


if __name__ == "__main__":
    tc = ApiTestCase("登录接口", "https://api.example.com/login", "POST")
    tc.set_body({"username": "admin", "password": "123456"})
    tc.set_header("Authorization", "Bearer token_xxx")

    suite = create_test_suite([tc])
    print(json.dumps(suite, indent=2, ensure_ascii=False))
`);

function onRun(runCode: string) {
  console.log('[componenttest] run:', runCode.length, 'chars');
}

function onSave(savedCode: string) {
  console.log('[componenttest] save:', savedCode.length, 'chars');
}
</script>

<style lang="scss" scoped>
.component-test {
  width: 100%;
  height: 100%;
  padding: 0;
  overflow: hidden;
}
</style>
