# Viva Notes Chanuka

Chanuka owns the Security Training, Quiz and Assessment module.

Key talking points:
- Training modules are assigned by user, department or role.
- Quiz correct answers must stay on the server.
- Attempts are stored separately and not overwritten.
- Compliance is derived from assignment, completion, deadline and pass or fail result.

Likely questions:
1. Why are answers not sent to the browser? To prevent users inspecting DevTools and cheating.
2. Who calculates scores? The backend.
3. Why store attempts? Compliance history and retry evidence.
4. What happens after max attempts? Further attempts are rejected.
5. How is overdue derived? Deadline plus incomplete state.

