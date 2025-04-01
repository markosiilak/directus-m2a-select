<template>
  <div class="m2a-field-selector">
    <template v-if="displayMode === 'button'">
      <v-button
        class="select-button"
        :disabled="disabled"
        @click="drawerOpen = true"
        secondary
      >
        <span v-if="selectedItems.length" class="selected-values">
          {{ selectedItems.map(item => getDisplayValue(item.item, item.outputField)).join(', ') }}
        </span>
        <span v-else>{{ placeholder || "Choose items..." }}</span>
        <v-icon name="arrow_right" />
      </v-button>
    </template>

    <template v-else-if="displayMode === 'drag'">
      <v-input
        v-model="searchQuery"
        placeholder="Search..."
        :icon-left="'search'"
        class="search-input"
      />
      <v-list class="collection-list direct-list">
        <div class="draggable-container">
          <template v-for="(item, index) in selectedItems" :key="`${item.collection}-${getItemIdentifier(item.item)}`">
            <v-list-item
              draggable="true"
              @dragstart="dragStart($event, index)"
              @dragover.prevent
              @dragenter.prevent
              @drop="drop($event, index)"
            >
              <v-list-item-content class="item-content">
                <div class="item-row">
                  <v-icon name="drag_handle" class="drag-handle" />
                  <v-checkbox
                    :model-value="true"
                    @click.stop="toggleItem({ collection: item.collection, outputField: item.outputField }, item.item)"
                  />
                  <span class="item-label">{{ getDisplayValue(item.item, item.outputField) }}</span>
                </div>
              </v-list-item-content>
            </v-list-item>
          </template>
        </div>

        <v-divider v-if="selectedItems.length > 0" />

        <template v-for="config in collections" :key="config.collection">
          <v-list-item
            v-for="item in filteredUnselectedItems(config)"
            :key="`${config.collection}-${getItemIdentifier(item)}`"
            clickable
            @click="toggleItem(config, item)"
          >
            <v-list-item-content class="item-content">
              <div class="item-row">
                <v-checkbox
                  :model-value="false"
                  @update:model-value="() => toggleItem(config, item)"
                />
                <span class="item-label">{{ getDisplayValue(item, config.outputField) }}</span>
              </div>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
    </template>

    <template v-else>
      <v-input
        v-model="searchQuery"
        placeholder="Search..."
        :icon-left="'search'"
        class="search-input"
      />
      <v-list class="collection-list direct-list">
        <template v-for="config in collections" :key="config.collection">
          <v-list-item
            v-for="item in filteredItems(config.collection, config.outputField)"
            :key="`${config.collection}-${getItemIdentifier(item)}`"
            clickable
            :active="isSelected(config.collection, getItemIdentifier(item))"
            @click="toggleItem(config, item)"
          >
            <v-list-item-content class="item-content">
              <div class="item-row">
                <v-checkbox
                  :model-value="isSelected(config.collection, getItemIdentifier(item))"
                  @click.stop
                  @click="toggleItem(config, item)"
                />
                <span class="item-label">{{ getDisplayValue(item, config.outputField) }}</span>
              </div>
            </v-list-item-content>
          </v-list-item>
        </template>
      </v-list>
    </template>

    <v-drawer
      v-model="drawerOpen"
      :title="placeholder || 'Choose items...'"
      @cancel="drawerOpen = false"
    >
      <template #actions>
        <v-button secondary @click="drawerOpen = false">Done</v-button>
      </template>

      <div class="drawer-content">
        <v-input
          v-model="searchQuery"
          placeholder="Search..."
          :icon-left="'search'"
          class="search-input"
        />

        <v-list class="collection-list">
          <template v-for="config in collections" :key="config.collection">
            <v-list-item
              v-for="item in filteredItems(config.collection, config.outputField)"
              :key="`${config.collection}-${getItemIdentifier(item)}`"
              clickable
              :active="isSelected(config.collection, getItemIdentifier(item))"
              @click="toggleItem(config, item)"
            >
              <v-list-item-content class="item-content">
                <div class="item-row">
                  <v-checkbox
                    :model-value="isSelected(config.collection, getItemIdentifier(item))"
                    @click.stop
                    @click="toggleItem(config, item)"
                  />
                  <span class="item-label">{{ getDisplayValue(item, config.outputField) }}</span>
                </div>
              </v-list-item-content>
            </v-list-item>
          </template>
        </v-list>
      </div>
    </v-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { useApi } from '@directus/extensions-sdk';

const api = useApi();

interface CollectionConfig {
  collection: string;
  outputField: string;
}

const props = defineProps<{
  value?: string | null;
  disabled?: boolean;
  collections: CollectionConfig[];
  placeholder?: string;
  outputFormat?: 'detailed' | 'simple' | 'ids' | 'languages';
  displayMode?: 'button' | 'drag';
}>();

const emit = defineEmits(['input']);

// State
const drawerOpen = ref(false);
const searchQuery = ref('');
const collectionItems = ref<Record<string, any[]>>({});
const selectedItems = ref<Array<{
  collection: string;
  outputField: string;
  item: any;
}>>([]);
const selectedOrder = ref<string[]>([]);

// Computed
const filteredItems = (collection: string, outputField: string) => {
  const items = collectionItems.value[collection] || [];
  if (!searchQuery.value) return items;
  return items.filter(item => {
    const displayValue = getDisplayValue(item, outputField);
    return String(displayValue).toLowerCase().includes(searchQuery.value.toLowerCase());
  });
};

const displayMode = computed(() => props.displayMode || 'button');

const filteredUnselectedItems = (config: CollectionConfig) => {
  const items = collectionItems.value[config.collection] || [];
  const filtered = items.filter(item => !isSelected(config.collection, getItemIdentifier(item)));
  if (!searchQuery.value) return filtered;
  return filtered.filter(item => {
    const displayValue = getDisplayValue(item, config.outputField);
    return String(displayValue).toLowerCase().includes(searchQuery.value.toLowerCase());
  });
};

// Methods
const fetchCollectionItems = async (collection: string) => {
  if (!collection) return;

  try {
    let url = `/items/${collection}`;

    if (props.collections.some(config =>
        config.collection === collection && config.outputField === 'translations')) {
      url += '?fields=*,translations.*';
    }

    const response = await api.get(url);
    const items = response.data.data;

    if (props.collections.some(config =>
        config.collection === collection && config.outputField === 'translations')) {
      for (const item of items) {
        if (item.translations && Array.isArray(item.translations) && item.translations.length > 0) {
          if (item.translations[0] && !item.translations[0].name && item.translations[0].id) {
            try {
              const translationsResponse = await api.get(`/items/translations?filter[id][_in]=${
                item.translations.map((t: any) => t.id).join(',')
              }`);
              if (translationsResponse.data && translationsResponse.data.data) {
                item.translations = translationsResponse.data.data;
              }
            } catch (error) {
              console.error('Error fetching translations:', error);
            }
          }
        }
      }
    }

    collectionItems.value[collection] = items;
  } catch (error) {
    console.error(`Error fetching items for ${collection}:`, error);
    collectionItems.value[collection] = [];
  }
};

const getItemIdentifier = (item: any): string => {
  return item.id ?? item.name ?? JSON.stringify(item);
};

const getDisplayValue = (item: any, outputField: string): string => {
  if (!item) return '';

  if (outputField === 'translations') {
    if (item.translations && Array.isArray(item.translations) && item.translations.length > 0) {
      for (const translation of item.translations) {
        if (translation && translation.name) {
          return translation.name;
        }
      }
      return 'Translation without name';
    }
    return item.name || item.title || 'No translations';
  }

  return item[outputField] || '';
};

const isSelected = (collection: string, itemId: string) => {
  return selectedItems.value.some(
    item => item.collection === collection && getItemIdentifier(item.item) === itemId
  );
};

const toggleItem = (config: CollectionConfig, item: any) => {
  const index = selectedItems.value.findIndex(
    selected => selected.collection === config.collection && getItemIdentifier(selected.item) === getItemIdentifier(item)
  );

  if (index === -1) {
    const newItems = [...selectedItems.value];
    newItems.push({
      collection: config.collection,
      outputField: config.outputField,
      item
    });
    selectedItems.value = newItems;
  } else {
    selectedItems.value = selectedItems.value.filter((_, i) => i !== index);
  }

  emitValue();
};

const emitValue = () => {
  if (selectedItems.value.length === 0) {
    emit('input', null);
    return;
  }

  const output = selectedItems.value.map(item => {
    const baseOutput = {
      collection: item.collection,
      field: item.outputField,
      value: getDisplayValue(item.item, item.outputField),
      id: getItemIdentifier(item.item)
    };

    // Add slug field for category items
    if (item.collection === 'category' && item.item.key) {
      return {
        ...baseOutput,
        slug: item.item.key
      };
    }

    // Add slug field for article_category items from translations title
    if (item.collection === 'article_category') {
      const displayValue = getDisplayValue(item.item, item.outputField);
      if (displayValue) {
        // Create a slug from the display value (lowercase, replace spaces with dashes)
        const slug = displayValue
          .toLowerCase()
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '');

        return {
          ...baseOutput,
          slug: slug
        };
      }
    }

    return baseOutput;
  });

  switch (props.outputFormat) {
    case 'simple':
      emit('input', JSON.stringify(output.map(item => item.value)));
      break;
    case 'ids':
      emit('input', JSON.stringify(output.map(item => item.id)));
      break;
    case 'languages':
      const languages = output
        .filter(item => item.collection === 'languages')
        .map(item => {
          const languageItem = collectionItems.value['languages']?.find(i => getItemIdentifier(i) === item.id);
          if (languageItem) {
            return {
              language: item.value,
              code: languageItem.code
            };
          }
          return null;
        })
        .filter(Boolean);
      emit('input', JSON.stringify(languages));
      break;
    default:
      emit('input', JSON.stringify(output));
  }
};

const processValue = (value: any) => {
  if (!value) return [];

  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;

    if (props.outputFormat === 'languages' && Array.isArray(parsed)) {
      return parsed.map(item => {
        const languageItem = collectionItems.value['languages']?.find(lang => lang.code === item.code);
        if (languageItem) {
          return {
            collection: 'languages',
            outputField: 'name',
            item: languageItem
          };
        }
        return null;
      }).filter(Boolean);
    }

    if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
      return Object.entries(collectionItems.value)
        .flatMap(([collection, items]) => {
          const config = props.collections.find(c => c.collection === collection);
          if (!config) return [];
          return items
            .filter(item => parsed.includes(item[config.outputField]))
            .map(item => ({
              collection,
              outputField: config.outputField,
              item
            }));
        });
    }

    if (Array.isArray(parsed) && parsed.length > 0 && (typeof parsed[0] === 'number' || typeof parsed[0] === 'string')) {
      return Object.entries(collectionItems.value)
        .flatMap(([collection, items]) => {
          const config = props.collections.find(c => c.collection === collection);
          if (!config) return [];
          return items
            .filter(item => parsed.includes(getItemIdentifier(item)))
            .map(item => ({
              collection,
              outputField: config.outputField,
              item
            }));
        });
    }

    if (Array.isArray(parsed)) {
      return parsed.map(item => {
        const config = props.collections.find(c => c.collection === item.collection);
        if (!config) return null;
        const foundItem = collectionItems.value[item.collection]?.find(
          i => getItemIdentifier(i) === item.id
        );
        if (!foundItem) return null;
        return {
          collection: item.collection,
          outputField: item.field || config.outputField,
          item: foundItem
        };
      }).filter(Boolean);
    }

    return [];
  } catch (error) {
    console.error('Error processing value:', error);
    return [];
  }
};

const draggedItem = ref<number | null>(null);

const dragStart = (event: DragEvent, index: number) => {
  draggedItem.value = index;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move';
  }
};

const drop = (event: DragEvent, index: number) => {
  event.preventDefault();
  if (draggedItem.value === null) return;

  const items = [...selectedItems.value];
  const itemToMove = items[draggedItem.value];
  items.splice(draggedItem.value, 1);
  items.splice(index, 0, itemToMove);

  selectedItems.value = items;
  draggedItem.value = null;
  emitValue();
};

onMounted(async () => {
  for (const config of props.collections) {
    await fetchCollectionItems(config.collection);
  }

  if (props.value) {
    try {
      const parsed = JSON.parse(props.value);
      const items = Array.isArray(parsed) ? parsed : [parsed];

      items.forEach(parsed => {
        const config = props.collections.find(c => c.collection === parsed.collection);
        if (config) {
          const item = collectionItems.value[parsed.collection]?.find(
            item => getItemIdentifier(item) === parsed.id
          );
          if (item) {
            selectedItems.value.push({
              collection: parsed.collection,
              outputField: parsed.field,
              item
            });
          }
        }
      });
    } catch (error) {
      console.error('Error parsing initial value:', error);
    }
  }
});

watch(selectedItems, (items) => {
  selectedOrder.value = items.map(item => `${item.collection}-${getItemIdentifier(item.item)}`);
}, { immediate: true });

watch(() => props.collections, async (newCollections) => {
  for (const config of newCollections) {
    if (!collectionItems.value[config.collection]) {
      await fetchCollectionItems(config.collection);
    }
  }
}, { deep: true });

watch(
  () => props.value,
  async (newValue) => {
    if (newValue) {
      await Promise.all(props.collections.map(async (config) => {
        if (!collectionItems.value[config.collection]) {
          await fetchCollectionItems(config.collection);
        }
      }));

      const processedItems = processValue(newValue);
      selectedItems.value = processedItems.filter((item): item is { collection: string; outputField: string; item: any } => item !== null);
    } else {
      selectedItems.value = [];
    }
  },
  { immediate: true }
);

</script>

<style lang="scss" scoped>
.m2a-field-selector {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.select-button {
  width: 100%;
  justify-content: space-between;
  text-align: left;
}

.drawer-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
}

.search-input {
  margin-bottom: 8px;
}

.collection-list {
  flex-grow: 1;
  overflow-y: auto;
}

.selected-values {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  padding-right: 8px;
}

.collection-header {
  background-color: var(--background-subdued);
  font-weight: 600;
  pointer-events: none;
  padding: 4px 8px;

  :deep(.v-list-item-content) {
    font-size: 0.9em;
    text-transform: uppercase;
    color: var(--foreground-subdued);
  }
}

.item-content {
  padding: 4px 0;
}

.item-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.direct-list {
  border: var(--border-width) solid var(--border-normal);
  border-radius: var(--border-radius);
  max-height: 400px;
}

.drag-handle {
  cursor: move;
  color: var(--foreground-subdued);
  margin-right: 8px;
}

.v-list-item-group {
  width: 100%;
}

.v-list-item {
  user-select: none;

  &[draggable="true"]:active {
    opacity: 0.5;
    background-color: var(--background-subdued);
  }
}
</style>
