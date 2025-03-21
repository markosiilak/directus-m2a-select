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

### Output Format
Choose how the selected items should be formatted in the data:

- **Detailed**: `{ collection: "items", id: 1, value: "Item name" }`
- **Simple**: `"Item name"`
- **IDs only**: `1`

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
- Local types: m2a
