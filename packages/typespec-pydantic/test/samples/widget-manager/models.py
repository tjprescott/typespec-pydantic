from pydantic import *
# FIXME: Can't just import *
from typing import Literal
from datetime import *
from decimal import *
from enum import Enum

class WidgetColor(Enum):
    _BLACK = "Black"
    _WHITE = "White"
    _RED = "Red"
    _GREEN = "Green"
    _BLUE = "Blue"


class Widget(BaseModel):
    name: str
    color: WidgetColor
    manufacturer_id: str
    etag: str


class WidgetRepairState(Enum):
    _SUCCEEDED = "Succeeded"
    _FAILED = "Failed"
    _CANCELED = "Canceled"
    _SENT_TO_MANUFACTURER = "SentToManufacturer"


class WidgetRepairRequest(BaseModel):
    request_state: WidgetRepairState
    scheduled_date_time: datetime
    created_date_time: datetime
    updated_date_time: datetime
    completed_date_time: datetime


class WidgetRepairStatusParams(BaseModel):
    widget_id: str


class WidgetPart(BaseModel):
    name: str
    part_id: str
    manufacturer_id: str
    etag: str


class WidgetPartReorderRequest(BaseModel):
    signed_off_by: str


class WidgetAnalytics(BaseModel):
    id: Literal["current"]
    use_count: int
    repair_count: int


class Manufacturer(BaseModel):
    id: str
    name: str
    address: str
    etag: str


class CustomResult(BaseModel):
    _my_result: str
    _my_error: str


class Versions(Enum):
    # FIXME: This was manually fixed
    v2022_08_31 = "2022-08-31"

# FIXME: All of these came from Azure.Core!

# class ExpectedTrait(BaseModel):
#     trait: str
#     diagnostic: str


# class NoClientRequestId(BaseModel):
#     client_request_id: object


# class NoConditionalRequests(BaseModel):
#     conditional_requests: object


# class NoRepeatableRequests(BaseModel):
#     repeatable_requests: object


# class TraitLocation(Enum):
#     _PARAMETERS = "Parameters"
#     _RESPONSE = "Response"
#     _API_VERSION_PARAMETER = "ApiVersionParameter"


# class TraitContext(Enum):
#     _READ = "Read"
#     _CREATE = "Create"
#     _UPDATE = "Update"
#     _DELETE = "Delete"
#     _LIST = "List"
#     _ACTION = "Action"
#     _UNDEFINED = "Undefined"


# class InnerError(BaseModel):
#     code: Optional[str]
#     innererror: Optional[InnerError]


# class Error(BaseModel):
#     code: str
#     message: str
#     target: Optional[str]
#     details: Optional[List[Error]]
#     innererror: Optional[InnerError]


# class ErrorResponse(BaseModel):
#     error: Error
#     error_code: Optional[str]


# class ApiVersionParameter(BaseModel):
#     api_version: str


# class RetryAfterHeader(BaseModel):
#     retry_after: Optional[int]


# class CustomizationFields(BaseModel):
#     parameters: Optional[object]
#     response: Optional[object]


# class OperationState(Enum):
#     _NOT_STARTED = "NotStarted"
#     _RUNNING = "Running"
#     _SUCCEEDED = "Succeeded"
#     _FAILED = "Failed"
#     _CANCELED = "Canceled"


# class EtagProperty(BaseModel):
#     etag: str


# class RepeatabilityRequestHeaders(BaseModel):
#     repeatability_request_id: Optional[str]
#     repeatability_first_sent: Optional[datetime]


# class RepeatabilityResponseHeaders(BaseModel):
#     repeatability_result: Optional[Literal["accepted", "rejected"]]


# class ConditionalRequestHeaders(BaseModel):
#     if_match: Optional[str]
#     if_none_match: Optional[str]
#     if_unmodified_since: Optional[datetime]
#     if_modified_since: Optional[datetime]


# class EtagResponseEnvelope(BaseModel):
#     etag_header: Optional[str]


# class ClientRequestIdHeader(BaseModel):
#     client_request_id: Optional[str]


# class StandardListQueryParameters(BaseModel):
#     top: Optional[int]
#     skip: Optional[int]
#     maxpagesize: Optional[int]


# class TopQueryParameter(BaseModel):
#     top: Optional[int]


# class SkipQueryParameter(BaseModel):
#     skip: Optional[int]


# class MaxPageSizeQueryParameter(BaseModel):
#     maxpagesize: Optional[int]


# class SelectQueryParameter(BaseModel):
#     select: Optional[List[str]]


# class RequestIdResponseHeader(BaseModel):
#     request_id: Optional[str]


# class AzureApiKeyAuthentication(BaseModel):
#     # FIXME: this presumably comes from Azure.Core
#     # _type: Literal[AuthType.API_KEY]
#     # FIXME: in is a reserved Python keyword. Also ApiKeyLocation is not defined
#     # _in: Literal[ApiKeyLocation.HEADER]
#     name: Literal["Ocp-Apim-Subscription-Key"]


# class OrderByQueryParameter(BaseModel):
#     orderby: Optional[List[str]]


# class FilterQueryParameter(BaseModel):
#     filter: Optional[str]


# class ExpandQueryParameter(BaseModel):
#     expand: Optional[List[str]]


# class Versions(Enum):
#     V1_0__PREVIEW_1 = "1.0-preview.1"
#     V1_0__PREVIEW_2 = "1.0-preview.2"
