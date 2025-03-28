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
          {{ selectedItems.map(item => item.item[item.outputField]).join(', ') }}
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
                    @update:model-value="() => toggleItem({ collection: item.collection, outputField: item.outputField }, item.item)"
                  />
                  <span class="item-label">{{ item.item[item.outputField] }}</span>
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
                <span class="item-label">{{ item[config.outputField] }}</span>
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
                  @update:model-value="toggleItem(config, item)"
                />
                <span class="item-label">{{ item[config.outputField] }}</span>
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
                    @update:model-value="toggleItem(config, item)"
                  />
                  <span class="item-label">{{ item[config.outputField] }}</span>
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
  outputFormat?: 'detailed' | 'simple' | 'ids';
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
  return items.filter(item =>
    String(item[outputField]).toLowerCase().includes(searchQuery.value.toLowerCase())
  );
};

// Add this computed property
const displayMode = computed(() => props.displayMode || 'button');

// Add this computed
const filteredUnselectedItems = (config: CollectionConfig) => {
  const items = collectionItems.value[config.collection] || [];
  const filtered = items.filter(item => !isSelected(config.collection, getItemIdentifier(item)));
  if (!searchQuery.value) return filtered;
  return filtered.filter(item =>
    String(item[config.outputField]).toLowerCase().includes(searchQuery.value.toLowerCase())
  );
};

// Methods
const fetchCollectionItems = async (collection: string) => {
  if (!collection) return;

  try {
    const response = await api.get(`/items/${collection}`);
    collectionItems.value[collection] = response.data.data;
  } catch (error) {
    console.error(`Error fetching items for ${collection}:`, error);
    collectionItems.value[collection] = [];
  }
};

// Add this helper function after the api const
const getItemIdentifier = (item: any): string => {
  return item.id ?? item.name ?? JSON.stringify(item);
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
    selectedItems.value.push({
      collection: config.collection,
      outputField: config.outputField,
      item
    });
  } else {
    selectedItems.value.splice(index, 1);
  }

  emitValue();
};

const emitValue = () => {
  if (selectedItems.value.length === 0) {
    emit('input', null);
    return;
  }

  const output = selectedItems.value.map(item => ({
    collection: item.collection,
    field: item.outputField,
    value: item.item[item.outputField],
    id: getItemIdentifier(item.item)
  }));

  switch (props.outputFormat) {
    case 'simple':
      emit('input', JSON.stringify(output.map(item => item.value)));
      break;
    case 'ids':
      emit('input', JSON.stringify(output.map(item => item.id)));
      break;
    default:
      // Detailed format
      emit('input', JSON.stringify(output));
  }
};

const processValue = (value: any) => {
  if (!value) return [];

  try {
    // If value is already an object/array, no need to parse
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;

    // Handle object format (single item)
    if (!Array.isArray(parsed) && typeof parsed === 'object') {
      return [parsed];
    }

    // Handle array format
    if (Array.isArray(parsed)) {
      // Handle simple format (strings array)
      if (parsed.length > 0 && typeof parsed[0] === 'string') {
        return Object.entries(collectionItems.value)
          .flatMap(([collection, items]) => {
            const config = props.collections.find(c => c.collection === collection);
            if (!config) return [];
            return items
              .filter(item => parsed.includes(item[config.outputField]))
              .map(item => ({
                collection,
                field: config.outputField,
                value: item[config.outputField],
                id: getItemIdentifier(item)
              }));
          });
      }

      // Handle ids format
      if (parsed.length > 0 && (typeof parsed[0] === 'number' || typeof parsed[0] === 'string')) {
        return Object.entries(collectionItems.value)
          .flatMap(([collection, items]) => {
            const config = props.collections.find(c => c.collection === collection);
            if (!config) return [];
            return items
              .filter(item => parsed.includes(getItemIdentifier(item)))
              .map(item => ({
                collection,
                field: config.outputField,
                value: item[config.outputField],
                id: getItemIdentifier(item)
              }));
          });
      }
    }

    return parsed;
  } catch (error) {
    console.error('Error processing value:', error);
    return [];
  }
};

// Add drag handlers
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

// Initialize
onMounted(async () => {
  // Fetch items for all collections
  for (const config of props.collections) {
    await fetchCollectionItems(config.collection);
  }

  // Set initial value if exists
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

// Initialize selectedOrder when items are loaded
watch(selectedItems, (items) => {
  selectedOrder.value = items.map(item => `${item.collection}-${getItemIdentifier(item.item)}`);
}, { immediate: true });

// Watch for collections changes
watch(() => props.collections, async (newCollections) => {
  for (const config of newCollections) {
    if (!collectionItems.value[config.collection]) {
      await fetchCollectionItems(config.collection);
    }
  }
}, { deep: true });

// Watch for value changes
watch(
  () => props.value,
  async (newValue) => {
    if (newValue) {
      const items = processValue(newValue);
      selectedItems.value = [];

      for (const parsed of items) {
        const config = props.collections.find(c => c.collection === parsed.collection);
        if (config) {
          if (!collectionItems.value[parsed.collection]) {
            await fetchCollectionItems(parsed.collection);
          }

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
      }
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
