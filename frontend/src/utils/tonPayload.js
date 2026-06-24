import { beginCell } from '@ton/core'

// TON Connect의 SendTransactionRequest.messages[].payload 는
// 평문 문자열이 아니라 "BOC를 base64로 인코딩한 바이너리"여야 한다.
// 단순 텍스트 코멘트를 첨부하려면 TON 표준 text-comment 셀
// (opcode 0x00000000 + UTF-8 텍스트)을 만들어서 BOC로 직렬화해야 한다.
//
// 잘못된 예: payload: btoa('missionlink:123')  // <- 그냥 base64 문자열, 유효한 셀이 아님 -> SDK 검증 실패
// 올바른 예: payload: buildCommentPayload('missionlink:123')
export function buildCommentPayload(text) {
  const cell = beginCell()
    .storeUint(0, 32)        // text comment opcode
    .storeStringTail(text)   // 코멘트 본문 (긴 텍스트는 자동으로 여러 셀에 분할됨)
    .endCell()

  return cell.toBoc().toString('base64')
}
