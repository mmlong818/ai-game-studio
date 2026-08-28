from collections import deque


INITIAL = [
    ("cao", "hero", 1, 0, 2, 2), ("guan", "guard", 1, 2, 2, 1),
    ("z1", "guard", 0, 0, 1, 2), ("z2", "guard", 3, 0, 1, 2),
    ("z3", "guard", 0, 2, 1, 2), ("z4", "guard", 3, 2, 1, 2),
    ("s1", "soldier", 0, 4, 1, 1), ("s2", "soldier", 3, 4, 1, 1),
    ("s3", "soldier", 1, 3, 1, 1), ("s4", "soldier", 2, 3, 1, 1),
]


def canonical(pieces):
    return tuple(sorted(((kind, w, h, x, y) for _, kind, x, y, w, h in pieces), key=lambda item: (item[0], item[1], item[2], item[4], item[3])))


def from_key(key):
    return [(str(index), kind, x, y, w, h) for index, (kind, w, h, x, y) in enumerate(key)]


def neighbors(key):
    pieces = from_key(key)
    for index, piece in enumerate(pieces):
        _, kind, x, y, w, h = piece
        for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            nx, ny = x + dx, y + dy
            if nx < 0 or ny < 0 or nx + w > 4 or ny + h > 5:
                continue
            blocked = any(other_index != index and nx < ox + ow and nx + w > ox and ny < oy + oh and ny + h > oy for other_index, (_, _, ox, oy, ow, oh) in enumerate(pieces))
            if blocked:
                continue
            moved = list(pieces)
            moved[index] = (piece[0], kind, nx, ny, w, h)
            yield canonical(moved)


def enumerate_component():
    start = canonical(INITIAL)
    queue = deque([start])
    seen = {start}
    while queue:
        state = queue.popleft()
        for neighbor in neighbors(state):
            if neighbor in seen:
                continue
            seen.add(neighbor)
            queue.append(neighbor)
    return seen


def goal_distances(component):
    goals = [state for state in component if any(kind == "hero" and x == 1 and y == 3 for kind, _, _, x, y in state)]
    queue = deque(goals)
    distances = {state: 0 for state in goals}
    while queue:
        state = queue.popleft()
        for neighbor in neighbors(state):
            if neighbor not in component or neighbor in distances:
                continue
            distances[neighbor] = distances[state] + 1
            queue.append(neighbor)
    return distances


def js_hash_template(value):
    result = 2166136261
    for character in value:
        result ^= ord(character)
        result = (result * 16777619) & 0xFFFFFFFF
    return result


def campaign_layout(number):
    pieces = [list(piece) for piece in INITIAL]
    tier = (number - 1) // 4 + 1
    variant = (number - 1) % 4
    steps = 4 + tier * 7 + variant * 2
    state = (js_hash_template("klotski") ^ ((number * 0x9E3779B1) & 0xFFFFFFFF)) & 0xFFFFFFFF
    previous = None
    for _ in range(steps):
        legal = []
        for piece in pieces:
            piece_id, _, x, y, w, h = piece
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                if previous and previous == (piece_id, -dx, -dy):
                    continue
                nx, ny = x + dx, y + dy
                if nx < 0 or ny < 0 or nx + w > 4 or ny + h > 5 or (piece_id == "cao" and nx == 1 and ny == 3):
                    continue
                if any(other[0] != piece_id and nx < other[2] + other[4] and nx + w > other[2] and ny < other[3] + other[5] and ny + h > other[3] for other in pieces):
                    continue
                legal.append((piece, dx, dy))
        if not legal:
            previous = None
            continue
        state = (state * 1664525 + 1013904223) & 0xFFFFFFFF
        piece, dx, dy = legal[int((state / 4294967296) * len(legal))]
        piece[2] += dx
        piece[3] += dy
        previous = (piece[0], dx, dy)
    return canonical(pieces)


def main():
    component = enumerate_component()
    distances = goal_distances(component)
    values = [distances[campaign_layout(number)] for number in range(1, 21)]
    print(f"states={len(component)} goals={sum(1 for value in distances.values() if value == 0)}")
    print(values)


if __name__ == "__main__":
    main()
