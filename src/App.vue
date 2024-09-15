<template>
  <div id="app">
    <h1>ICD-10-CM Code Search</h1>
    <div class="search-container">
      <input v-model="searchQuery" @input="debouncedSearch" type="text" placeholder="Search for ICD codes...">
    </div>
    <div v-if="loading">Loading...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else-if="groupedResults.length === 0 && searchQuery">No results found</div>
    <div v-else class="results">
      <div v-for="(group, index) in groupedResults" :key="index" class="result-group">
        <div class="result-item level-1">
          <strong>{{ group.formatted_code }}</strong>: {{ group.description }}
        </div>
        <div v-for="child in group.children" :key="child.formatted_code" class="result-item level-2">
          <strong>{{ child.formatted_code }}</strong>: {{ child.description }}
          <div v-for="grandchild in child.children" :key="grandchild.formatted_code" class="result-item level-3">
            <strong>{{ grandchild.formatted_code }}</strong>: {{ grandchild.description }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, watch, computed } from 'vue';
import debounce from 'lodash/debounce';

export default {
  name: 'App',
  setup() {
    const searchQuery = ref('');
    const results = ref([]);
    const loading = ref(false);
    const error = ref(null);

    const search = async () => {
      if (searchQuery.value.length < 3) {
        results.value = [];
        return;
      }

      loading.value = true;
      error.value = null;

      try {
        const response = await fetch(`http://localhost:3000/api/search?query=${encodeURIComponent(searchQuery.value)}`);
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        results.value = await response.json();
      } catch (err) {
        console.error('Error:', err);
        error.value = 'An error occurred while searching';
      } finally {
        loading.value = false;
      }
    };

    const debouncedSearch = debounce(() => {
      search();
    }, 300);

    watch(searchQuery, () => {
      if (searchQuery.value.length < 3) {
        results.value = [];
      }
    });

    const groupedResults = computed(() => {
      const groups = {};
      results.value.forEach(result => {
        const parentCode = result.formatted_code.split('.')[0];
        if (!groups[parentCode]) {
          groups[parentCode] = { 
            formatted_code: parentCode, 
            description: result.description, 
            children: [] 
          };
        }
        if (result.formatted_code.includes('.')) {
          const childCode = result.formatted_code.split('.')[0] + '.' + result.formatted_code.split('.')[1][0];
          let child = groups[parentCode].children.find(c => c.formatted_code === childCode);
          if (!child) {
            child = { formatted_code: childCode, description: result.description, children: [] };
            groups[parentCode].children.push(child);
          }
          if (result.formatted_code.split('.')[1].length > 1) {
            child.children.push(result);
          }
        }
      });
      return Object.values(groups).sort((a, b) => a.formatted_code.localeCompare(b.formatted_code));
    });

    return {
      searchQuery,
      groupedResults,
      loading,
      error,
      debouncedSearch
    };
  }
}
</script>

<style>
#app {
  font-family: Arial, sans-serif;
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
}

.search-container {
  margin-bottom: 20px;
}

input {
  width: 100%;
  padding: 10px;
  font-size: 16px;
}

.result-group {
  margin-bottom: 20px;
}

.result-item {
  margin-bottom: 5px;
  padding: 5px;
  background-color: #f0f0f0;
  border-radius: 4px;
}

.level-1 {
  font-weight: bold;
}

.level-2 {
  margin-left: 20px;
  background-color: #f5f5f5;
}

.level-3 {
  margin-left: 40px;
  background-color: #fafafa;
}
</style>
