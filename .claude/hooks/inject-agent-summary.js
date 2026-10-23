let data = '';
process.stdin.on('data', c => data += c);
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(data);
  } catch (e) {
    process.exit(0);
  }
  const toolInput = input.tool_input || {};
  if (typeof toolInput.prompt !== 'string' || toolInput.prompt.includes('agent-summaries/')) {
    return;
  }

  const role = (toolInput.subagent_type || 'agent').toLowerCase();
  // description 맨 앞의 "로드맵항목번호-수정차수"(예: "12-3 게임 엔진 수정")를 파일명 접두어로 쓴다.
  // 번호가 없으면 접두어 없이 "업무-역할.md"로 만든다.
  const description = (toolInput.description || 'task').trim();
  const numbered = description.match(/^\[?(\d+-\d+)\]?[\s:]+(.+)$/);
  const prefix = numbered ? `${numbered[1]}-` : '';
  const slug = (numbered ? numbered[2] : description)
    .trim()
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 50)
    .replace(/-+$/, '') || 'task';
  const filename = `agent-summaries/${prefix}${slug}-${role}.md`;

  const note = `\n\n---\n작업 완료 후, 무엇을 했는지와 주요 변경/발견 사항을 요약해서 저장소 루트의 ${filename} 파일로 (경로/파일명 그대로, 다르게 바꾸지 말고) 작성해줘.`;
  const updatedInput = Object.assign({}, toolInput, { prompt: toolInput.prompt + note });
  console.log(JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      updatedInput
    }
  }));
});
