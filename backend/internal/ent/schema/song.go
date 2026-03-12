package schema

import (
	"time"

	"entgo.io/ent"
	"entgo.io/ent/dialect"
	"entgo.io/ent/dialect/entsql"
	"entgo.io/ent/schema"
	"entgo.io/ent/schema/edge"
	"entgo.io/ent/schema/field"
	"github.com/google/uuid"
)

// Song 歌曲資料表 schema 定義
type Song struct {
	ent.Schema
}

// Annotations 設定資料表名稱為 songs
func (Song) Annotations() []schema.Annotation {
	return []schema.Annotation{
		entsql.Annotation{Table: "songs"},
	}
}

// Fields 定義 songs 資料表欄位
func (Song) Fields() []ent.Field {
	return []ent.Field{
		field.UUID("id", uuid.UUID{}).
			Default(uuid.New),
		field.String("title").
			MaxLen(255).
			NotEmpty(),
		field.String("artist").
			MaxLen(255).
			Optional().
			Nillable(),
		field.Text("lyrics").
			NotEmpty(),
		field.Text("lrc_timestamps").
			Optional().
			Nillable(),
		field.JSON("lrc_content", map[string]interface{}{}).
			Optional().
			SchemaType(map[string]string{
				dialect.Postgres: "jsonb",
			}),
		field.String("language").
			MaxLen(2).
			Optional().
			Nillable(),
		field.UUID("user_id", uuid.UUID{}),
		field.Time("created_at").
			Default(time.Now).
			SchemaType(map[string]string{
				dialect.Postgres: "timestamptz",
			}).
			Immutable(),
		field.Time("updated_at").
			Default(time.Now).
			UpdateDefault(time.Now).
			SchemaType(map[string]string{
				dialect.Postgres: "timestamptz",
			}),
	}
}

// Edges 定義 Song 的關聯
func (Song) Edges() []ent.Edge {
	return []ent.Edge{
		edge.From("user", User.Type).
			Ref("songs").
			Field("user_id").
			Required().
			Unique(),
		edge.To("playlist_songs", PlaylistSong.Type),
	}
}
