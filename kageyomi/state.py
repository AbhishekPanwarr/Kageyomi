from typing import Any, Annotated, NotRequired, TypedDict
import operator

class AgentState(TypedDict, total=False):
    query: str
    symbol: str
    job_id: str
    selected_agent: str
    detected_intent: str
    primary_agent: str
    active_agents: list[str]
    intent_scores: dict[str, int]
    model_cid: str
    max_tools: int
    news_keyword: str
    macro_event: str
    treasury_ticker: str
    index_ticker: str
    
    # Tool receipts
    receipts: Annotated[list[dict[str, Any]], operator.add]
    reasoning_steps: Annotated[list[str], operator.add]
    
    # Agent outputs
    flow_signal: NotRequired[dict[str, Any]]
    narrative_signal: NotRequired[dict[str, Any]]
    treasury_signal: NotRequired[dict[str, Any]]
    index_signal: NotRequired[dict[str, Any]]
    macro_signal: NotRequired[dict[str, Any]]
    venture_signal: NotRequired[dict[str, Any]]
    
    # Final output
    strategy_report: NotRequired[dict[str, Any]]
    output_hash: NotRequired[str]
    receipt_root: NotRequired[str]
    receipts_cid: NotRequired[str]
    trace_hash: NotRequired[str]
    
    errors: Annotated[list[str], operator.add]
