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
            :key="`${config.collection}-${item.id}`"
            clickable
            :active="isSelected(config.collection, item.id)"
            @click="toggleItem(config, item)"
          >
            <v-list-item-content class="item-content">
              <div class="item-row">
                <v-checkbox
                  :model-value="isSelected(config.collection, item.id)"
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
              :key="`${config.collection}-${item.id}`"
              clickable
              :active="isSelected(config.collection, item.id)"
              @click="toggleItem(config, item)"
            >
              <v-list-item-content class="item-content">
                <div class="item-row">
                  <v-checkbox
                    :model-value="isSelected(config.collection, item.id)"
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
  displayMode?: 'button' | 'list';
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

const isSelected = (collection: string, id: string) => {
  return selectedItems.value.some(
    item => item.collection === collection && item.item.id === id
  );
};

const toggleItem = (config: CollectionConfig, item: any) => {
  const index = selectedItems.value.findIndex(
    selected => selected.collection === config.collection && selected.item.id === item.id
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
    id: item.item.id
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
                id: item.id
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
              .filter(item => parsed.includes(item.id))
              .map(item => ({
                collection,
                field: config.outputField,
                value: item[config.outputField],
                id: item.id
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
            item => item.id === parsed.id
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
            item => item.id === parsed.id
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
</style>
