import "typespec-pydantic";
import "@typespec/http";

using TypeSpec.Http;
using Pydantic;

@service({
  title: "Contoso Widget Manager",
})
namespace Contoso.WidgetManager;

// Models ////////////////////

@doc("The color of a widget.")
enum WidgetColor {
  @doc("Black")
  Black,

  @doc("White")
  White,

  @doc("Red")
  Red,

  @doc("Green")
  Green,

  @doc("Blue")
  Blue,
}

@doc("A widget.")
model Widget {
  @key("widgetName")
  @doc("The widget name.")
  @visibility("read")
  name: string;

  @doc("The widget color.")
  color: WidgetColor;

  @doc("The ID of the widget's manufacturer.")
  manufacturerId: string;
}

@doc("The repair state of a widget.")
enum WidgetRepairState {
  @doc("Widget repairs succeeded.")
  Succeeded,

  @doc("Widget repairs failed.")
  Failed,

  @doc("Widget repairs were canceled.")
  Canceled,

  @doc("Widget was sent to the manufacturer.")
  SentToManufacturer,
}

@doc("A submitted repair request for a widget.")
model WidgetRepairRequest {
  @doc("The state of the widget repair request.")
  requestState: WidgetRepairState;

  @doc("The date and time when the repair is scheduled to occur.")
  scheduledDateTime: utcDateTime;

  @doc("The date and time when the request was created.")
  createdDateTime: utcDateTime;

  @doc("The date and time when the request was updated.")
  updatedDateTime: utcDateTime;

  @doc("The date and time when the request was completed.")
  completedDateTime: utcDateTime;
}

@doc("The parameters for a widget status request")
model WidgetRepairStatusParams {
  @doc("The ID of the widget being repaired.")
  widgetId: string;
}

@doc("A widget's part.")
model WidgetPart {
  @key("widgetPartName")
  @doc("The name of the part.")
  @visibility("read")
  name: string;

  @doc("The ID to use for reordering the part.")
  partId: string;

  @doc("The ID of the part's manufacturer.")
  manufacturerId: string;
}

@doc("The details of a reorder request for a WidgetPart.")
model WidgetPartReorderRequest {
  @doc("Identifies who signed off the reorder request.")
  signedOffBy: string;
}

// An example of a singleton resource
@doc("Provides analytics about the use and maintenance of a Widget.")
model WidgetAnalytics {
  @key("analyticsId")
  @doc("The identifier for the analytics object.  There is only one named 'current'.")
  @visibility("read")
  id: "current";

  @doc("The number of uses of the widget.")
  useCount: int64;

  @doc("The number of times the widget was repaired.")
  repairCount: int64;
}

@doc("A manufacturer of widgets.")
model Manufacturer {
  @key("manufacturerId")
  @doc("The manufacturer's unique ID.")
  @visibility("read")
  id: string;

  @doc("The manufacturer's name.")
  name: string;

  @doc("The manufacturer's full address.")
  address: string;
}

@error
model Error {
  id: string;
  msg?: string;
}

// Operations ////////////////////

@get
op getWidget(name: string): Widget | Error;
