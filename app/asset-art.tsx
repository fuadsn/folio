import type { Kind } from "../lib/world";
export default function AssetArt({
  kind,
  color = "#b3a3d5",
}: {
  kind: Kind;
  color?: string;
}) {
  const nature = ["tree", "pine", "palm", "rock", "flowers", "pond"].includes(
    kind,
  );
  return (
    <svg viewBox="0 0 120 95" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="81" rx="35" ry="8" fill="#263730" opacity=".08" />
      {nature ? (
        kind === "rock" ? (
          <>
            <path d="m30 76 8-30 23-8 25 16 8 22-33 9Z" fill={color} />
            <path d="m38 46 23-8 25 16-25 10Z" fill="#d4d6c6" />
            <path d="m61 64 25-10 8 22-33 9Z" fill="#83918a" />
          </>
        ) : kind === "pond" ? (
          <>
            <ellipse cx="60" cy="70" rx="43" ry="15" fill="#c7c5ad" />
            <ellipse cx="60" cy="68" rx="37" ry="12" fill={color} />
            <path d="m37 66 20 4 21-5" stroke="#dbeddf" strokeWidth="2" />
          </>
        ) : kind === "flowers" ? (
          <>
            {[35, 58, 82].map((x, i) => (
              <g key={x}>
                <path
                  d={`M${x} 79V${40 + i * 8}`}
                  stroke="#7e9772"
                  strokeWidth="3"
                />
                <circle cx={x} cy={38 + i * 8} r="12" fill={color} />
                <circle cx={x} cy={38 + i * 8} r="4" fill="#f5df92" />
              </g>
            ))}
          </>
        ) : (
          <>
            <path d="M57 50h7v30l-7 2z" fill="#a88162" />
            {kind === "pine" ? (
              <>
                <path d="m60 14 28 43H32Z" fill={color} />
                <path d="m60 30 32 38H28Z" fill={color} />
                <path d="m60 14 28 43H60Z" fill="#416b60" opacity=".3" />
              </>
            ) : (
              <>
                <path
                  d="m36 24 28-9 25 18 2 25-24 14-32-12-10-21Z"
                  fill={color}
                />
                <path
                  d="m64 15 25 18 2 25-24 14-1-32Z"
                  fill="#345d45"
                  opacity=".17"
                />
                <path d="m36 24 28-9 2 25-41-1Z" fill="#fff" opacity=".18" />
              </>
            )}
          </>
        )
      ) : ["cube", "sphere", "cone", "platform", "custom"].includes(kind) ? (
        kind === "sphere" ? (
          <>
            <circle cx="60" cy="49" r="30" fill={color} />
            <path
              d="M40 26c-2 31 14 44 42 42-33 34-66-6-42-42"
              fill="#000"
              opacity=".1"
            />
          </>
        ) : kind === "cone" ? (
          <path d="M60 16 24 72q34 18 72 0Z" fill={color} />
        ) : (
          <>
            <path d="m25 37 35-18 35 18-35 20Z" fill={color} />
            <path d="m25 37 35 20v28L25 66Z" fill={color} />
            <path d="m60 57 35-20v29L60 85Z" fill={color} />
            <path d="m60 57 35-20v29L60 85Z" fill="#000" opacity=".18" />
          </>
        )
      ) : ["bench", "sign", "mailbox", "lamp", "flag"].includes(kind) ? (
        kind === "bench" ? (
          <>
            <path d="m24 57 51-14 24 16-51 16Z" fill={color} />
            <path d="M24 39 75 25v17L24 56Z" fill={color} />
            <path
              d="m28 64 1 16m53-17 2 14m-48-28 1 15m47-24 1 18"
              stroke="#4b5551"
              strokeWidth="4"
            />
          </>
        ) : kind === "lamp" ? (
          <>
            <path d="M61 29v52" stroke="#495653" strokeWidth="5" />
            <path d="m45 27 16-9 16 9v22l-16 7-16-8Z" fill={color} />
            <path d="m41 25 20-14 20 14-20 7Z" fill="#53605a" />
          </>
        ) : (
          <>
            <path d="M43 51v31m35-39v31" stroke="#a88162" strokeWidth="5" />
            <path d="m28 27 61-16v41L28 68Z" fill={color} />
            <path d="m35 32 47-12v26L35 59Z" fill="#f3ead9" />
            <path
              d="m43 37 30-7m-30 16 21-5"
              stroke="#a4947e"
              strokeWidth="3"
            />
          </>
        )
      ) : (
        <>
          <path d="m22 70 37-18 42 20-39 18Z" fill="#d8cdbb" />
          <path d="m29 36 30-16 35 18v34L62 86 29 69Z" fill="#f0e6d2" />
          <path d="m62 52 32-14v34L62 86Z" fill="#d9cbb4" />
          {kind === "observatory" ? (
            <path d="M25 41C23 5 91-3 97 38L62 55Z" fill={color} />
          ) : kind === "tower" ? (
            <>
              <path d="m43 26 18-9 18 9v-5L62 2 43 20Z" fill={color} />
              <path d="m44 24 18 9 17-7v25L61 60 44 48Z" fill={color} />
            </>
          ) : (
            <>
              <path d="m20 39 36-29 49 28-39 20Z" fill={color} />
              <path d="m20 39 36-29 9 48Z" fill="#fff" opacity=".15" />
            </>
          )}
          <path d="m40 51 11 5v17l-11-5Z" fill="#698887" />
          <path d="m72 55 10-4v11l-10 5Z" fill="#769a9e" />
          <path d="m38 42 7 3v7l-7-3Z" fill="#eddbb6" />
        </>
      )}
    </svg>
  );
}
