# M2A Field Selector Interface

A Directus interface extension that allows selecting items from multiple collections with custom field output.

## Installation

1. Download or clone this repository
2. Install dependencies with `npm install`
3. Build the extension with `npm run build`
4. Move the built extension to your Directus extensions folder

## Features

- Select items from multiple collections
- Customize the output field for each collection
- Three display modes: button, drag, and direct
- Search functionality
- Drag and drop reordering (in drag mode)
- Three output format options:
  - Detailed: Returns collection and ID information
  - Simple: Returns only the selected field values
  - IDs only: Returns only the item IDs

## Configuration

The interface has the following configuration options:

### Collections
Add one or more collections and specify which field should be used as the output value for each collection.

Format:
```json
{
  "collection": "collection_name",
  "outputField": "field_name"
}
```

### Display Mode
Choose how the interface should be displayed:

- **Button**: Opens a drawer with the selection interface (default)
- **Drag**: Shows selected items in a draggable list for reordering
- **Direct**: Shows the selection interface directly in the field

### Output Format
Choose how the selected items should be formatted in the data:

- **Detailed**: Returns a standard Directus M2A relationship format
  ```json
  {
    "categories": [
      {
        "collection": "category",
        "field": "title",
        "value": "Camps",
        "id": 94426642
      },
      {
        "collection": "category",
        "field": "title",
        "value": "Film",
        "id": 3143044
      },
      {
        "collection": "category",
        "field": "title",
        "value": "Music",
        "id": 104263205
      }
    ]
  }
  ```
- **Simple**: Returns an array of output field values
  ```json
  ["Item 1", "Item 2", "Item 3"]
  ```
- **IDs only**: Returns an array of item IDs
  ```json
  [1, 2, 3]
  ```

### Placeholder
Customize the placeholder text shown in the selector.

## Usage

1. Create a field with type `json` or `alias`
2. Select "M2A Field Selector" as the interface
3. Configure the collections and output fields
4. Select the desired output format

## Compatibility

- Directus 9.x and later
- Field types: json, alias
