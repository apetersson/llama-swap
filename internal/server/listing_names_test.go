package server

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/mostlygeek/llama-swap/internal/config"
	"gopkg.in/yaml.v3"
)

func TestServer_EndpointListingNames(t *testing.T) {
	var mc config.ModelConfig
	if err := yaml.Unmarshal([]byte(`
name: Speech Service
aliases: [plain, fallback]
namesByID:
  speech: Transcription + Speaker Labels
  plain: "  Transcription  "
  fallback: " "
  not-a-route: Ignored
capabilities:
  in: [audio]
  out: [text]
  disableAuto: true
`), &mc); err != nil {
		t.Fatal(err)
	}
	s := newTestServer(newStubRouter(nil, ""), newStubRouter(nil, ""))
	s.cfg = config.Config{IncludeAliasesInList: true, Models: map[string]config.ModelConfig{"speech": mc}}
	w := httptest.NewRecorder()
	s.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/v1/models", nil))
	var response struct {
		Data []modelRecord `json:"data"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	want := map[string]string{"speech": "Transcription + Speaker Labels", "plain": "Transcription", "fallback": "Speech Service"}
	if len(response.Data) != len(want) {
		t.Fatalf("unexpected routes: %s", w.Body.String())
	}
	for _, record := range response.Data {
		if record.Name != want[record.ID] {
			t.Errorf("%s: name=%q want %q", record.ID, record.Name, want[record.ID])
		}
		if record.ID != "speech" && record.Meta["llamaswap"].(map[string]any)["modelID"] != "speech" {
			t.Errorf("alias lost shared process identity: %+v", record)
		}
	}
	if s.cfg.Models["speech"].Name != "Speech Service" {
		t.Fatal("listing changed process name")
	}
}
