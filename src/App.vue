<template>
  <div id="app">
    <div class="container">
      <h1>ICD-10-CM Code Search</h1>
      <div class="search-container">
        <input v-model="searchQuery" @input="debouncedSearch" type="text" placeholder="Search for ICD codes...">
        <span class="search-icon">🔍</span>
      </div>
      <div v-if="loading" class="loading">Loading...</div>
      <div v-else-if="error" class="error">{{ error }}</div>
      <div v-else-if="groupedResults.length === 0 && searchQuery" class="no-results">No results found</div>
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
            description: result.category_description || result.description, 
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
        } else if (result.formatted_code === parentCode) {
          // Update the parent description if this is the actual parent code
          groups[parentCode].description = result.description;
        }
      });

      // Custom sorting function for ICD-10 codes
      const sortICDCodes = (a, b) => {
        const [aBase, aExt] = a.formatted_code.split('.');
        const [bBase, bExt] = b.formatted_code.split('.');
        
        if (aBase !== bBase) {
          return aBase.localeCompare(bBase);
        }
        
        if (!aExt && !bExt) return 0;
        if (!aExt) return -1;
        if (!bExt) return 1;
        
        return aExt.localeCompare(bExt);
      };

      // Sort the groups, children, and grandchildren
      return Object.values(groups)
        .sort(sortICDCodes)
        .map(group => ({
          ...group,
          children: group.children
            .sort(sortICDCodes)
            .map(child => ({
              ...child,
              children: child.children.sort(sortICDCodes)
            }))
        }));
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
* {
  box-sizing: border-box;
}

body {
  font-family: 'Arial', 'Helvetica', sans-serif;
  line-height: 1.6;
  color: #333;
  background-color: #f9f9f9;
}

#app {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.container {
  max-width: 800px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  font-size: 2.5rem;
  color: #2c3e50;
}

input {
  width: 100%;
  padding: 12px 40px;
  font-size: 16px;
  border: none;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  transition: box-shadow 0.3s ease, background-color 0.3s ease;
  background-color: #ffffff;
}

input:focus {
  outline: none;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
  background-color: #ffffff;
  transform: scale(1.01);
}

.result-group {
  margin-bottom: 20px;
  background-color: #ffffff;
  border-radius: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  animation: fadeIn 0.3s ease-out;
  transition: box-shadow 0.3s ease;
}

.result-group:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.result-item {
  padding: 15px;
  border-bottom: 1px solid #e0e0e0;
  transition: background-color 0.2s ease;
}

.result-item:last-child {
  border-bottom: none;
}

.result-item:hover {
  background-color: #f5f5f5;
}

.level-1 {
  font-weight: bold;
  background-color: #E3F2FD;
  color: #1976D2;
  font-size: 1.1rem;
}

.level-2 {
  padding-left: 30px;
  font-size: 1rem;
}

.level-3 {
  padding-left: 45px;
  font-size: 0.95rem;
  color: #616161;
}

.loading, .error, .no-results {
  text-align: center;
  padding: 20px;
  color: #757575;
  font-style: italic;
  animation: fadeIn 0.3s ease-out;
}

@keyframes pulse {
  0% { opacity: 0.6; }
  50% { opacity: 1; }
  100% { opacity: 0.6; }
}

.loading {
  animation: pulse 1.5s infinite ease-in-out;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: #9e9e9e;
  pointer-events: none;
  transition: color 0.2s ease;
}

.search-container:hover .search-icon {
  color: #1976D2;
}

#app {
  display: flex;
  justify-content: center;
  padding: 20px;
}

.container {
  max-width: 800px;
  width: 100%;
}

h1 {
  text-align: center;
  margin-bottom: 20px;
}

.search-container {
  position: relative;
  margin-bottom: 20px;
}
</style>
