# High-Performance Wikipedia Search and Analysis Tool

## The task

-   Construct a minimalistic, single-page React application that searches and presents Wikipedia results emphasizing swift performance and secure interactions. Keep track of the search history for each user.
-   Create a minimalist responsive user interface with visual feedback during data fetching.

Requirements: Develop a Node.js server to manage Wikipedia API interactions from multiple users and utilize React hooks for frontend state control.

## The solution

Frontend: Reаct v18.2.0, backend: Node v21.6.0

React hooks utilized: useContext, useReducer, useState, useEffect, useRef, useCallback, useMemo

-   Performance is optimized by debouncing during typing, with fast suggestions of the ten first hits.
-   Full-text search returns the first 500 results displayed in a virtualized list.
-   The application is compiled with optimization provided by Vite. The search history for each user is kept in the state.
-   Response body size is decreased by gzip, the backend caches Wiki's response (~30x faster repeating loading).
-   The backend is managed by PM2 process management with the ability to enforce load balancing.

All the work was developed by Eugenio Besson. Feel free to provide your feedback or suggest any improvements.

### Proof of Concept demo

Click here to see the demo: [https://wiki.4dates.net](https://wiki.4dates.net)
